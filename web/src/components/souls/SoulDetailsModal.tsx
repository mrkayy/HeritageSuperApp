import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Soul } from '@/services/soulService';

interface SoulDetailsModalProps {
  soul: Soul | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getStatusColor: (status: string) => string;
}

function SoulDetailsMobile({ soul, getStatusColor }: { soul: Soul; getStatusColor: (status: string) => string }) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Phone:</span>
          <span>{soul.phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Gender:</span>
          <span>{soul.gender}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Age Range:</span>
          <span>{soul.age_range}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Status:</span>
          <Badge className={getStatusColor(soul.response_status || '')}>
            {soul.response_status === 'saved' ? 'Saved' : 'Not Saved'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Address:</span>
          <span className="text-right">{soul.address}</span>
        </div>
        {soul.note && (
          <div>
            <span className="font-medium">Notes:</span>
            <p className="mt-1 text-muted-foreground">{soul.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SoulDetailsDesktop({ soul, getStatusColor }: { soul: Soul; getStatusColor: (status: string) => string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Phone:</span> {soul.phone}
            </div>
            <div>
              <span className="font-medium">Gender:</span> {soul.gender}
            </div>
            <div>
              <span className="font-medium">Age Range:</span> {soul.age_range}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <Badge className={getStatusColor(soul.response_status || '')}>
                {soul.response_status === 'saved' ? 'Saved' : 'Not Saved'}
              </Badge>
            </div>
            <div className="col-span-full">
              <span className="font-medium">Address:</span> {soul.address}
            </div>
            {soul.latitude && soul.longitude && (
              <div className="col-span-full">
                <span className="font-medium">Coordinates:</span> {soul.latitude}, {soul.longitude}
              </div>
            )}
            {soul.note && (
              <div className="col-span-full">
                <span className="font-medium">Notes:</span> {soul.note}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SoulDetailsModal({ soul, open, onOpenChange, getStatusColor }: SoulDetailsModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {soul?.full_name} - Details
            </DrawerTitle>
          </DrawerHeader>
          {soul && <SoulDetailsMobile soul={soul} getStatusColor={getStatusColor} />}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {soul?.full_name} - Details
          </DialogTitle>
        </DialogHeader>
        {soul && <SoulDetailsDesktop soul={soul} getStatusColor={getStatusColor} />}
      </DialogContent>
    </Dialog>
  );
}
