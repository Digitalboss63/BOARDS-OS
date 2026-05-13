import { useState } from "react";
import { 
  useListScoutingReports, 
  useCreateScoutingReport, 
  useUpdateScoutingReport, 
  useDeleteScoutingReport,
  useListTeams,
  getListScoutingReportsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Eye, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const reportSchema = z.object({
  teamId: z.coerce.number().min(1, "Required"),
  opponentName: z.string().min(1, "Required"),
  gameDate: z.string().optional(),
  offensiveSystem: z.string().optional(),
  defensiveSystem: z.string().optional(),
  keyPlayers: z.string().optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  adjustments: z.string().optional(),
  notes: z.string().optional(),
});

export default function Scouting() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [viewingReport, setViewingReport] = useState<any>(null);
  
  const { data: reports, isLoading } = useListScoutingReports();
  const { data: teams } = useListTeams();
  
  const createReport = useCreateScoutingReport();
  const updateReport = useUpdateScoutingReport();
  const deleteReport = useDeleteScoutingReport();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      teamId: 0,
      opponentName: "",
      gameDate: "",
      offensiveSystem: "",
      defensiveSystem: "",
      keyPlayers: "",
      strengths: "",
      weaknesses: "",
      adjustments: "",
      notes: ""
    }
  });

  const handleEdit = (report: any) => {
    setEditingReport(report);
    form.reset({
      ...report,
      gameDate: report.gameDate ? report.gameDate.split('T')[0] : "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this scouting report?")) {
      deleteReport.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScoutingReportsQueryKey() });
          toast({ title: "Report deleted" });
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof reportSchema>) => {
    const payload = {
      ...values,
      gameDate: values.gameDate ? new Date(values.gameDate).toISOString() : undefined
    };
    
    if (editingReport) {
      updateReport.mutate({ id: editingReport.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScoutingReportsQueryKey() });
          toast({ title: "Report updated" });
          setIsDialogOpen(false);
          setEditingReport(null);
        }
      });
    } else {
      createReport.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScoutingReportsQueryKey() });
          toast({ title: "Report created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Scouting Intel</h1>
          <p className="text-muted-foreground mt-1">Opponent analysis, systems, and game plan adjustments.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingReport(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider font-semibold" data-testid="button-add-report">
              <Plus className="mr-2 h-4 w-4" /> New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-card border-border/50 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-wide text-xl">
                {editingReport ? "Edit Intel" : "New Scouting Report"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="teamId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Our Team</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value ? field.value.toString() : ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {teams?.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="opponentName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opponent</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="gameDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Game Date (Optional)</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="offensiveSystem" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offensive System</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Dribble Drive, 5-Out" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="defensiveSystem" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Defensive System</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Pack Line, 2-3 Zone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="keyPlayers" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Threats / Personnel</FormLabel>
                    <FormControl><Textarea {...field} className="h-20" placeholder="List key players and tendencies..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="strengths" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strengths</FormLabel>
                      <FormControl><Textarea {...field} className="h-20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="weaknesses" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weaknesses</FormLabel>
                      <FormControl><Textarea {...field} className="h-20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="adjustments" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Plan Adjustments</FormLabel>
                    <FormControl><Textarea {...field} className="h-20" placeholder="How we will attack/defend..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button type="submit" disabled={updateReport.isPending || createReport.isPending} data-testid="button-save-report">
                    {editingReport ? "Save Intel" : "Create Report"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border-border/50 shadow-sm bg-card/50">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : reports?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border/50 border-dashed">
            No scouting intel found. Add a report to prepare for the next matchup.
          </div>
        ) : (
          reports?.map((report) => (
            <Card key={report.id} className="border-border/50 shadow-sm bg-card/50 hover:border-primary/50 transition-colors group flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted/20 rounded border border-border/50">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-display font-bold uppercase tracking-wide">
                        {report.opponentName}
                      </CardTitle>
                      {report.gameDate && (
                        <CardDescription className="text-xs font-mono mt-1 text-muted-foreground">
                          Target Date: {new Date(report.gameDate).toLocaleDateString()}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingReport(report)} data-testid={`button-view-report-${report.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(report)} data-testid={`button-edit-report-${report.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(report.id)} data-testid={`button-delete-report-${report.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-muted/10 p-3 rounded border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Offensive Sys</p>
                    <p className="text-sm font-medium">{report.offensiveSystem || 'Unknown'}</p>
                  </div>
                  <div className="bg-muted/10 p-3 rounded border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Defensive Sys</p>
                    <p className="text-sm font-medium">{report.defensiveSystem || 'Unknown'}</p>
                  </div>
                </div>
                {report.keyPlayers && (
                  <div className="mt-auto">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Key Personnel</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.keyPlayers}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Modal */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="sm:max-w-[800px] bg-card border-border/50 max-h-[90vh] overflow-y-auto">
          {viewingReport && (
            <>
              <DialogHeader className="border-b border-border/50 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Scouting Intel Report</p>
                    <DialogTitle className="font-display uppercase tracking-wide text-3xl">
                      {viewingReport.opponentName}
                    </DialogTitle>
                  </div>
                  {viewingReport.gameDate && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Game Date</p>
                      <p className="font-mono text-sm">{new Date(viewingReport.gameDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Offensive System</h4>
                    <p className="text-lg font-medium">{viewingReport.offensiveSystem || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Defensive System</h4>
                    <p className="text-lg font-medium">{viewingReport.defensiveSystem || '—'}</p>
                  </div>
                </div>

                {viewingReport.keyPlayers && (
                  <div className="bg-muted/10 p-4 rounded border border-border/50">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Key Personnel</h4>
                    <p className="text-sm whitespace-pre-wrap">{viewingReport.keyPlayers}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  {viewingReport.strengths && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        Strengths
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.strengths}</p>
                    </div>
                  )}
                  {viewingReport.weaknesses && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center">
                        <span className="w-2 h-2 rounded-full bg-destructive mr-2"></span>
                        Weaknesses
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.weaknesses}</p>
                    </div>
                  )}
                </div>

                {viewingReport.adjustments && (
                  <div className="border-t border-border/50 pt-4">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Game Plan Adjustments</h4>
                    <p className="text-sm whitespace-pre-wrap font-medium">{viewingReport.adjustments}</p>
                  </div>
                )}
                
                {viewingReport.notes && (
                  <div className="border-t border-border/50 pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Additional Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
