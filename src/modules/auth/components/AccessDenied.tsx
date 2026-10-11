import { useNavigate } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Role } from '@/platform/types/roles';

interface AccessDeniedProps {
  userRole: Role;
  requiredRoles: Role[];
}

export function AccessDenied({ userRole, requiredRoles }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your current role is <span className="font-semibold">{userRole}</span>.
          </p>
          <p className="text-muted-foreground">
            This page requires one of the following roles:{' '}
            <span className="font-semibold">{requiredRoles.join(', ')}</span>.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
