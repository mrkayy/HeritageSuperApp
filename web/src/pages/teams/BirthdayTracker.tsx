import React, { useState, useEffect } from 'react';
import { MembershipService, Member } from '@/services/membershipService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cake, Phone, Mail, Sparkles, MessageCircle, Calendar, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function BirthdayTracker() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await MembershipService.fetchMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load member birthday records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentDay = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;

  // Filter members born in selected month
  const birthdayMembers = members
    .filter(m => m.dateOfBirthMonth === selectedMonth)
    .sort((a, b) => (a.dateOfBirthDay || 0) - (b.dateOfBirthDay || 0));

  const todaysBirthdays = members.filter(
    m => m.dateOfBirthMonth === currentMonth && m.dateOfBirthDay === currentDay
  );

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl">
        <div>
          <Badge variant="outline" className="text-pink-500 border-pink-500/30 mb-2">
            <Cake className="w-3.5 h-3.5 mr-1" /> Pastoral Care & Celebrations
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Member Birthday Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and reach out to members celebrating birthdays each month.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Select Month:</span>
          <Select
            value={String(selectedMonth)}
            onValueChange={val => setSelectedMonth(Number(val))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Today's Celebrants Highlight (if viewing current month) */}
      {selectedMonth === currentMonth && todaysBirthdays.length > 0 && (
        <Card className="border-2 border-pink-500/50 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-rose-500/10 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-pink-500 text-white animate-bounce">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Celebrating Birthday Today! ({todaysBirthdays.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Don't forget to send them warm wishes on behalf of the church today.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysBirthdays.map(m => (
              <Card key={m.id} className="glass-card bg-background/80 p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-foreground">{m.firstName} {m.surname}</div>
                  <div className="text-xs text-muted-foreground">{m.phoneNumber || m.email || 'No contact provided'}</div>
                </div>
                {m.phoneNumber && (
                  <Button asChild size="sm" className="bg-pink-500 text-white hover:bg-pink-600">
                    <a href={`https://wa.me/${m.phoneNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="w-4 h-4 mr-1" /> Wish
                    </a>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly Birthdays Grid */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              Birthdays in {monthLabel} ({birthdayMembers.length})
            </CardTitle>
            <CardDescription>Members born during {monthLabel}, ordered by day</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading birthdays...</div>
          ) : birthdayMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No member birthdays recorded for {monthLabel}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {birthdayMembers.map(m => {
                const isToday = selectedMonth === currentMonth && m.dateOfBirthDay === currentDay;
                return (
                  <Card
                    key={m.id}
                    className={`glass-card p-4 flex flex-col justify-between transition-all ${
                      isToday ? 'border-pink-500 ring-2 ring-pink-500/20' : 'hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-base text-foreground">
                            {m.firstName} {m.surname}
                          </div>
                          {m.currentStage && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {m.currentStage.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant={isToday ? "default" : "secondary"}
                          className={`text-xs px-2.5 py-1 ${isToday ? 'bg-pink-500 text-white' : ''}`}
                        >
                          <Cake className="w-3 h-3 mr-1" /> Day {m.dateOfBirthDay}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                        {m.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {m.email}
                          </div>
                        )}
                        {m.phoneNumber && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {m.phoneNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-end gap-2">
                      {m.phoneNumber && (
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                          <a href={`tel:${m.phoneNumber}`}>
                            <Phone className="w-3 h-3 mr-1" /> Call
                          </a>
                        </Button>
                      )}
                      {m.phoneNumber && (
                        <Button asChild size="sm" className="h-8 text-xs bg-pink-500 text-white hover:bg-pink-600">
                          <a href={`https://wa.me/${m.phoneNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
