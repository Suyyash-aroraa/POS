import { useAuth } from "@/hooks/use-auth";

export function AuthDebug() {
  const { user, isLoading, error } = useAuth();
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-xs overflow-auto z-50">
      <h5 className="font-bold">Auth Debug</h5>
      <div>
        <strong>Loading:</strong> {isLoading ? 'true' : 'false'}
      </div>
      <div>
        <strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}
      </div>
      {error && (
        <div>
          <strong>Error:</strong> {error.message}
        </div>
      )}
    </div>
  );
}