import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { s3IntegratedStorage as storage } from "./s3-integrated-storage";
import { User } from "@shared/schema";
import { log } from "./vite";

// Import the actual User interface from schema
import type { User as UserSchema } from "@shared/schema";

declare global {
  namespace Express {
    // Define User interface for Express that matches our schema
    interface User extends UserSchema {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if stored password has the expected format
    if (!stored || !stored.includes('.')) {
      log(`Password comparison failed: stored password "${stored}" does not have the expected format`);
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    log(`Comparing passwords - parsed salt: ${salt}, hashed length: ${hashed.length}`);
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    log(`Password comparison result: ${result ? 'MATCH' : 'NO MATCH'}`);
    
    return result;
  } catch (error) {
    log(`Error comparing passwords: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      log(`Error stack: ${error.stack}`);
    }
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "restaurant-pos-secret",
    resave: true, // Changed to true to ensure session is saved back to store
    saveUninitialized: true, // Changed to true to ensure new sessions are saved
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: 'lax'
    }
  };
  
  log(`Setting up session with store: ${storage.sessionStore ? 'Available' : 'Not available'}`);
  log(`Session secret length: ${(process.env.SESSION_SECRET || "").length} characters`);

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          log(`User not found: ${username}`);
          return done(null, false);
        }
        
        log(`User found: ${username} (ID: ${user.id}), checking password...`);
        if (user.password) {
          log(`Password hash exists for user ${username}: ${user.password.substring(0, 20)}...`);
        } else {
          log(`No password hash found for user ${username}`);
          return done(null, false);
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          log(`Password does not match for user ${username}`);
          return done(null, false);
        } else {
          log(`Password matches for user ${username}, login successful`);
          return done(null, user);
        }
      } catch (error) {
        log(`Error during login for ${username}: ${error instanceof Error ? error.message : String(error)}`);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    log(`Serializing user: ${user.username} (ID: ${user.id})`);
    return done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        log(`User not found during deserialization: ${id}`);
        return done(null, false);
      }
      log(`User found during deserialization: ${user.username} (ID: ${id})`);
      return done(null, user);
    } catch (error) {
      log(`Error during user deserialization: ${error instanceof Error ? error.message : String(error)}`);
      return done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      log(`Registration attempt for username: ${req.body.username}`);
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        log(`Registration failed: username ${req.body.username} already exists`);
        return res.status(400).json({ message: "Username already exists" });
      }
      
      log(`Hashing password for new user: ${req.body.username}`);
      const hashedPassword = await hashPassword(req.body.password);
      log(`Password hashed successfully for ${req.body.username}: ${hashedPassword.substring(0, 20)}...`);

      log(`Creating new user in storage: ${req.body.username}`);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      log(`User created successfully: ${user.username} (ID: ${user.id})`);

      // Remove password from response
      const userWithoutPassword = { ...user } as Record<string, any>;
      if (userWithoutPassword.password) {
        delete userWithoutPassword.password;
      }

      log(`Initiating session login for new user: ${user.username} (ID: ${user.id})`);
      req.login(user, (err: Error | null) => {
        if (err) {
          log(`Session login failed for new user: ${err.message}`);
          return next(err);
        }
        log(`Session login successful for new user: ${user.username} (ID: ${user.id})`);
        log(`User registration completed successfully: ${user.username}`);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      log(`Registration error: ${error instanceof Error ? error.message : String(error)}`);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    log(`Login endpoint hit for username: ${req.body.username}`);
    
    passport.authenticate("local", (err: Error | null, user?: Express.User, info?: { message: string }) => {
      if (err) {
        log(`Passport authentication error: ${err.message}`);
        return next(err);
      }
      
      if (!user) {
        log(`Login failed: Invalid credentials for username: ${req.body.username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      log(`Passport authentication successful for: ${user.username} (ID: ${user.id})`);
      log(`Initiating session login for: ${user.username} (ID: ${user.id})`);
      
      req.login(user, (err: Error | null) => {
        if (err) {
          log(`Session login error: ${err.message}`);
          return next(err);
        }
        
        log(`Session login successful for: ${user.username} (ID: ${user.id})`);
        
        // Remove password from response
        const userWithoutPassword = { ...user } as Record<string, any>;
        if (userWithoutPassword.password) {
          delete userWithoutPassword.password;
        }
        
        log(`Login completed successfully for: ${user.username} (ID: ${user.id})`);
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    log(`GET /api/user - isAuthenticated: ${req.isAuthenticated()}`);
    
    if (!req.isAuthenticated()) {
      log('User not authenticated, returning 401');
      return res.sendStatus(401);
    }
    
    log(`User authenticated: ${req.user.username} (ID: ${req.user.id})`);
    
    // Remove password from response
    const userWithoutPassword = { ...req.user } as Record<string, any>;
    if (userWithoutPassword.password) {
      delete userWithoutPassword.password;
    }
    
    log(`Returning user data for: ${req.user.username} (ID: ${req.user.id})`);
    res.json(userWithoutPassword);
  });
}
