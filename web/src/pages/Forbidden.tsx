import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center page-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You don't have permission to view this page. This area belongs to a
          different team. Please contact your team lead if you believe this is
          an error.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
