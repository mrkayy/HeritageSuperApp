import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Search, 
  User, 
  Building2, 
  GraduationCap, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  HeartHandshake, 
  Award, 
  ArrowLeft,
  Loader2,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { GeneralOverseerService, UniversalMemberSearchResult, Member360Dossier } from '@/services/generalOverseerService';

export default function GeneralOverseerDossier() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UniversalMemberSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Member Dossier
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<Member360Dossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setHasSearched(true);
      const results = await GeneralOverseerService.searchMembers(searchQuery.trim());
      setSearchResults(results);
    } catch {
      toast({
        title: "Search Error",
        description: "Failed to perform universal member intelligence search",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleOpenDossier = async (memberId: string) => {
    try {
      setSelectedMemberId(memberId);
      setLoadingDossier(true);
      const data = await GeneralOverseerService.getMember360Dossier(memberId);
      setDossier(data);
    } catch {
      toast({
        title: "Dossier Error",
        description: "Failed to load complete spiritual dossier",
        variant: "destructive",
      });
    } finally {
      setLoadingDossier(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" /> Universal Intelligence
            </Badge>
            <Badge variant="secondary" className="text-xs">
              General Overseer & Super Admin Executive View
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            360° Universal Member Intelligence Dossier
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global cross-branch intelligence lookup across all chartered local church branches, tracking lifetime discipleship, attendance, and pastoral SitReps.
          </p>
        </div>
        {selectedMemberId && (
          <Button variant="outline" size="sm" onClick={() => setSelectedMemberId(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Search
          </Button>
        )}
      </div>

      {!selectedMemberId ? (
        <>
          {/* Global Search Bar Card */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search any church member across all branches by First Name, Surname, Phone, or Email..."
                    className="pl-11 h-12 text-sm rounded-xl bg-background/80"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={searching} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-sm font-semibold">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2 text-amber-300" />}
                  Execute Universal Query
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Results */}
          {hasSearched && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Cross-Branch Search Results</CardTitle>
                <CardDescription>Found {searchResults.length} matching profile(s) across all branches.</CardDescription>
              </CardHeader>
              <CardContent>
                {searching ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                    <p>Aggregating records across all local church databases...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No church members found matching &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(member => (
                      <div
                        key={member.id}
                        className="p-5 rounded-2xl border border-border/60 bg-secondary/10 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between"
                        onClick={() => handleOpenDossier(member.id)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {member.first_name[0]}{member.surname[0]}
                              </div>
                              <div>
                                <h4 className="font-bold text-foreground text-sm">{member.first_name} {member.surname}</h4>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Building2 className="w-3 h-3 text-primary" />
                                  <span>{member.church_name}</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {member.current_stage.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground pt-2">
                            {member.phone_number && (
                              <div className="flex items-center gap-1.5 font-mono">
                                <Phone className="w-3 h-3 text-muted-foreground" /> {member.phone_number}
                              </div>
                            )}
                            {member.email && (
                              <div className="flex items-center gap-1.5 font-mono truncate">
                                <Mail className="w-3 h-3 text-muted-foreground" /> {member.email}
                              </div>
                            )}
                          </div>
                        </div>

                        <Button size="sm" variant="ghost" className="w-full mt-4 text-xs text-primary font-semibold hover:bg-primary/10">
                          Inspect 360° Dossier ➔
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : loadingDossier ? (
        <div className="p-24 glass-card rounded-2xl text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-3" />
          <p className="font-semibold text-foreground">Assembling 360-Degree Spiritual Dossier...</p>
          <p className="text-xs text-muted-foreground mt-1">Aggregating attendance, classes, and pastoral logs across all branches.</p>
        </div>
      ) : dossier ? (
        <div className="space-y-6">
          {/* Dossier Header Card */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {dossier.member.firstName[0]}{dossier.member.surname[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-foreground">
                        {dossier.member.firstName} {dossier.member.surname}
                      </h2>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">
                        {dossier.member.currentStage.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Chartered Branch: <strong className="text-foreground">{dossier.church_name}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="p-3 bg-secondary/30 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-medium">LIFETIME ATTENDANCE</span>
                    <span className="text-xl font-bold text-foreground">{dossier.total_visits} Services</span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-medium">DISCIPLESHIP STAGES</span>
                    <span className="text-xl font-bold text-primary">{dossier.stages.length || 1} Milestones</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-border/50 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="font-mono text-foreground">{dossier.member.phoneNumber || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="font-mono text-foreground truncate">{dossier.member.email || 'No email recorded'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-foreground truncate">{dossier.member.homeAddress || 'Address not specified'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dossier Tabs */}
          <Tabs defaultValue="journey" className="space-y-4">
            <TabsList className="bg-secondary/40 p-1">
              <TabsTrigger value="journey" className="text-xs gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Spiritual Journey & Discipleship
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Service Presence History
              </TabsTrigger>
              <TabsTrigger value="engagement" className="text-xs gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5" /> Serving & Ministry Teams
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Journey */}
            <TabsContent value="journey">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Discipleship Milestones Timeline</CardTitle>
                  <CardDescription>Chronological transition through discipleship and ministry academy stages.</CardDescription>
                </CardHeader>
                <CardContent>
                  {dossier.stages.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      Currently enrolled at initial growth stage: <strong>{dossier.member.currentStage.replace(/_/g, ' ')}</strong>
                    </div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/20">
                      {dossier.stages.map((stage, idx) => (
                        <div key={idx} className="flex items-start gap-4 relative pl-8">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-xs font-bold absolute left-0 top-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground capitalize text-sm">
                              {stage.stage.replace(/_/g, ' ')}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              Transitioned on {new Date(stage.changed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Attendance */}
            <TabsContent value="attendance">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Service Attendance Ledger</CardTitle>
                  <CardDescription>Verified presence across all church services.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-secondary/10 rounded-xl text-center">
                    <p className="text-2xl font-bold text-foreground">{dossier.total_visits}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Verified Service Attendances across all branches</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Serving & Teams */}
            <TabsContent value="engagement">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Ministry & Volunteer Engagements</CardTitle>
                  <CardDescription>Teams and departments served in church life.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-secondary/10 rounded-xl text-center text-xs text-muted-foreground">
                    <Award className="w-8 h-8 mx-auto mb-2 text-primary opacity-60" />
                    Member is active within the local church community and discipleship pipeline.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
