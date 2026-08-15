import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Member, MembershipService } from '@/services/membershipService';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface GuardianRelationshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  allMembers: Member[];
}

export default function GuardianRelationshipModal({ open, onOpenChange, member, allMembers }: GuardianRelationshipModalProps) {
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Add new relationship form state
  const [selectedRelativeId, setSelectedRelativeId] = useState('');
  const [relationshipType, setRelationshipType] = useState('parent');
  const [adding, setAdding] = useState(false);

  const loadRelationships = useCallback(async () => {
    if (!member?.id) return;
    try {
      setLoading(true);
      const data = await MembershipService.fetchGuardianRelationships(member.id);
      setRelationships(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load guardian relationships",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [member?.id]);

  useEffect(() => {
    if (open && member) {
      loadRelationships();
      setSelectedRelativeId('');
      setRelationshipType('parent');
    }
  }, [open, member, loadRelationships]);

  const handleAdd = async () => {
    if (!member?.id || !selectedRelativeId || !relationshipType) return;
    try {
      setAdding(true);
      // If we are selecting a parent/guardian for this member (the child)
      // then child_member_id = member.id, guardian_member_id = selectedRelativeId
      // Or if this member is the parent/guardian for someone else (the child)
      // we need to know the direction. Let's assume the user selects a role for the relative relative to this member.
      // Actually, let's keep it simple: the relationship is "child" if this member is the guardian, etc.
      // Wait, relationshipType is from the schema: "parent", "guardian", "grandparent", "sibling_guardian".
      // By default, the schema has child_member_id and guardian_member_id. 
      // Let's assume if adding from the child's profile, the relative is the guardian.
      
      await MembershipService.addGuardianRelationship({
        child_member_id: member.id,
        guardian_member_id: selectedRelativeId,
        relationship: relationshipType,
      });
      
      toast({
        title: "Success",
        description: "Relationship added successfully",
      });
      setSelectedRelativeId('');
      loadRelationships();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to add relationship",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (relId: string) => {
    try {
      await MembershipService.deleteGuardianRelationship(relId);
      toast({
        title: "Success",
        description: "Relationship removed",
      });
      loadRelationships();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to remove relationship",
        variant: "destructive",
      });
    }
  };

  if (!member) return null;

  const availableMembers = allMembers.filter(m => m.id !== member.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Family & Guardian Relationships</DialogTitle>
          <DialogDescription>
            Manage parents, guardians, and kids for {member.firstName} {member.surname}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Add Relationship</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Relative</Label>
                <Select value={selectedRelativeId} onValueChange={setSelectedRelativeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Relationship (Relative is...)</Label>
                <Select value={relationshipType} onValueChange={setRelationshipType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Relationship..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="sibling_guardian">Sibling Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={adding || !selectedRelativeId}>
                {adding ? 'Adding...' : 'Add'}
                <UserPlus className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Current Relationships</h4>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : relationships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No relationships found.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Relative Name</TableHead>
                      <TableHead>Relationship Role</TableHead>
                      <TableHead>Linked As</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relationships.map((rel) => {
                      const isChild = rel.child_member_id === member.id;
                      const relativeName = isChild ? rel.guardian_name : rel.child_name;
                      const linkedAs = isChild ? "This member's Guardian" : "This member's Child";
                      
                      return (
                        <TableRow key={rel.id}>
                          <TableCell className="font-medium">{relativeName}</TableCell>
                          <TableCell className="capitalize">{rel.relationship.replace('_', ' ')}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {linkedAs}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(rel.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
