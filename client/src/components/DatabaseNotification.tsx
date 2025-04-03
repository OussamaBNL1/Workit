import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

export function DatabaseNotification() {
  const [databaseType, setDatabaseType] = useState<string | null>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Fetch database type from the server
    fetch("/api/system/info")
      .then(res => res.json())
      .then(data => {
        if (data && data.databaseType) {
          setDatabaseType(data.databaseType);
        }
      })
      .catch(error => {
        console.error("Error fetching database info:", error);
        // Default to memory database if we can't get the info
        setDatabaseType("in-memory");
      });
  }, []);

  if (!show || !databaseType) return null;

  const isMemoryDb = databaseType.toLowerCase().includes("memory");

  return (
    <Alert 
      className={cn(
        "fixed bottom-4 right-4 w-auto max-w-md z-50 flex items-center shadow-lg",
        isMemoryDb ? "bg-yellow-50 border-yellow-300 text-yellow-800" : "bg-green-50 border-green-300 text-green-800"
      )}
    >
      <Database className="h-4 w-4 mr-2" />
      <div>
        <AlertTitle className="text-sm font-medium">
          {isMemoryDb ? "Development Mode" : "Production Mode"}
        </AlertTitle>
        <AlertDescription className="text-xs">
          {isMemoryDb 
            ? "Using in-memory database. Data will be lost when the server restarts."
            : "Using persistent database. Your data will be saved."}
        </AlertDescription>
      </div>
      <button 
        onClick={() => setShow(false)} 
        className="ml-auto text-xs text-gray-500 hover:text-gray-700"
      >
        Dismiss
      </button>
    </Alert>
  );
}