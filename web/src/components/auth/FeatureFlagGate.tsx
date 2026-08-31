import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '@/contexts/FeatureFlagContext';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface FeatureFlagGateProps {
  flagKey: string;
  children: React.ReactNode;
  fallback?: 'redirect' | 'message';
}

export const FeatureFlagGate: React.FC<FeatureFlagGateProps> = ({
  flagKey,
  children,
  fallback = 'message',
}) => {
  const isEnabled = useFeatureFlag(flagKey);

  if (!isEnabled) {
    if (fallback === 'redirect') {
      return <Navigate to="/" replace />;
    }

    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <Card className="glass-card border border-border/60 shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Module Currently Inactive</h2>
            <p className="text-sm text-muted-foreground">
              This feature or module is currently disabled by church administrators. Please check back later or contact your team lead for more information.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureFlagGate;
