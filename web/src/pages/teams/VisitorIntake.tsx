import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { InfoCenterService, Visitor } from '@/services/infoCenterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { visitorIntakeSchema, type VisitorIntakeFormValues } from '@/lib/schemas/infocenter';

const defaultValues: VisitorIntakeFormValues = {
  first_name: '',
  last_name: '',
  phone_number: '',
  gender: 'male',
  address: '',
  email: '',
  prayer_request: '',
  invited_by_member_id: '',
  invited_by_text: '',
  notes: '',
};

export default function VisitorIntake() {
  const navigate = useNavigate();
  const [duplicateVisitor, setDuplicateVisitor] = useState<Visitor | null>(null);
  const [phoneChecked, setPhoneChecked] = useState(false);

  const form = useZodForm({
    schema: visitorIntakeSchema,
    initialValues: defaultValues,
  });

  const checkPhoneDuplicate = useCallback(async (phone: string) => {
    if (phone.length < 7) {
      setDuplicateVisitor(null);
      setPhoneChecked(false);
      return;
    }
    const existing = await InfoCenterService.checkPhone(phone);
    setDuplicateVisitor(existing);
    setPhoneChecked(true);
  }, []);

  const onSubmit = async (data: VisitorIntakeFormValues) => {
    try {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        gender: data.gender,
        address: data.address,
        email: data.email || undefined,
        prayer_request: data.prayer_request || undefined,
        invited_by_member_id: data.invited_by_member_id || undefined,
        invited_by_text: data.invited_by_text || undefined,
        notes: data.notes || undefined,
      };

      await InfoCenterService.createVisitor(payload);

      toast({
        title: "Visitor Registered",
        description: `${data.first_name} ${data.last_name} has been successfully registered.`,
      });

      form.reset();
      setDuplicateVisitor(null);
      setPhoneChecked(false);
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.response?.data?.message || "Failed to register visitor",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Visitor Intake
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Register New Visitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture first-timer information for follow-up and integration tracking.
          </p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Visitor Details</CardTitle>
          <CardDescription>All fields marked with * are required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Phone number with duplicate check */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="phone_number"
                  {...form.getInputProps('phone_number')}
                  placeholder="+234 801 234 5678"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => checkPhoneDuplicate(form.values.phone_number)}
                  disabled={form.values.phone_number.length < 7}
                >
                  <Phone className="w-4 h-4 mr-1" /> Check
                </Button>
              </div>
              <FieldError message={form.errors.phone_number} />
              {phoneChecked && duplicateVisitor && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This phone number is already registered to{' '}
                    <strong>{duplicateVisitor.first_name} {duplicateVisitor.last_name}</strong>{' '}
                    (Status: {duplicateVisitor.status.replace(/_/g, ' ')}, Visits: {duplicateVisitor.visit_count}).
                    Consider marking attendance instead.
                  </AlertDescription>
                </Alert>
              )}
              {phoneChecked && !duplicateVisitor && (
                <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> No existing record found
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...form.getInputProps('first_name')}
                  placeholder="e.g. Samuel"
                />
                <FieldError message={form.errors.first_name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...form.getInputProps('last_name')}
                  placeholder="e.g. Adebayo"
                />
                <FieldError message={form.errors.last_name} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select {...form.getSelectProps('gender')}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={form.errors.gender} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.getInputProps('email')}
                  placeholder="samuel@example.com"
                />
                <FieldError message={form.errors.email} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Residential Address *</Label>
              <Input
                id="address"
                {...form.getInputProps('address')}
                placeholder="e.g. 15 Adeola Odeku St, Victoria Island, Lagos"
              />
              <FieldError message={form.errors.address} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invited_by_text">Invited By (Name or Description)</Label>
              <Input
                id="invited_by_text"
                {...form.getInputProps('invited_by_text')}
                placeholder="e.g. Sister Mary, saw on social media, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prayer_request">Prayer Request</Label>
              <Textarea
                id="prayer_request"
                value={form.values.prayer_request}
                onChange={(e) => form.setValue('prayer_request', e.target.value)}
                placeholder="Any specific prayer needs..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={form.values.notes}
                onChange={(e) => form.setValue('notes', e.target.value)}
                placeholder="Observations, special needs, etc."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => navigate('/teams/info-center')}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.isSubmitting || !!duplicateVisitor}>
                {form.isSubmitting ? 'Registering...' : 'Register Visitor'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
