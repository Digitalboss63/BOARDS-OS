import { useState } from "react";
import { 
  useListPractices, 
  useCreatePractice, 
  useUpdatePractice, 
  useDeletePractice,
  useListTeams,
  getListPracticesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, Edit2, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";

const practiceSchema = z.object({
  teamId: z.coerce.number().min(1, "Required"),
  scheduledAt: z.string().min(1, "Required"),
  durationMinutes: z.coerce.number().min(1, "Required"),
  focus: z.string().min(1, "Required"),
  drills: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("scheduled"),
});

export default function Practices() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState<any>(null);
  
  const { data: practices, isLoading } = useListPractices();
  const { data: teams } = useListTeams();
  
  const createPractice = useCreatePractice();
  const updatePractice = useUpdatePractice();
  const deletePractice = useDeletePractice();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof practiceSchema>>({
    resolver: zodResolver(practiceSchema),
    defaultValues: {
      teamId: 0,
      scheduledAt: new Date().toISOString().slice(0, 16),
      durationMinutes: 120,
      focus: "",
      drills: "",
      notes: "",
      status: "scheduled"
    }
  });

  const handleEdit = (practice: any) => {
    setEditingPractice(practice);
    form.reset({
      ...practice,
      scheduledAt: new Date(practice.scheduledAt).toISOString().slice(0, 16),
      drills: practice.drills || undefined,
      notes: practice.notes || undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this practice?")) {
      deletePractice.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPracticesQueryKey() });
          toast({ title: "Practice deleted" });
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof practiceSchema>) => {
    const payload = {
      ...values,
      scheduledAt: new Date(values.scheduledAt).toISOString()
    };
    
    if (editingPractice) {
      updatePractice.mutate({ id: editingPractice.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPracticesQueryKey() });
          toast({ title: "Practice updated" });
          setIsDialogOpen(false);
          setEditingPractice(null);
        }
      });
    } else {
      createPractice.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPracticesQueryKey() });
          toast({ title: "Practice created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Practice Planner</h1>
          <p className="text-muted-foreground mt-1">Schedule and script practice sessions.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPractice(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider font-semibold" data-testid="button-add-practice">
              <Plus className="mr-2 h-4 w-4" /> Schedule Practice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border/50 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-wide text-xl">
                {editingPractice ? "Edit Practice" : "Schedule Practice"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="teamId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
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
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="scheduledAt" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (mins)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="focus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Practice Focus</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Transition defense, motion offense" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="drills" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drill Script</FormLabel>
                    <FormControl><Textarea {...field} className="min-h-[100px]" placeholder="List planned drills..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Additional notes for coaches..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updatePractice.isPending || createPractice.isPending} data-testid="button-save-practice">
                    {editingPractice ? "Save Changes" : "Schedule"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="border-border/50 shadow-sm bg-card/50">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : practices?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border/50 border-dashed">
            No practices scheduled. Create one to get started.
          </div>
        ) : (
          practices?.map((practice) => {
            const team = teams?.find(t => t.id === practice.teamId);
            const date = new Date(practice.scheduledAt);
            
            return (
              <Card key={practice.id} className="border-border/50 shadow-sm bg-card/50 hover:border-primary/50 transition-colors group">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-48 bg-muted/20 p-6 flex flex-col justify-center items-center border-r border-border/50 text-center">
                    <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
                      {format(date, 'MMM')}
                    </div>
                    <div className="text-4xl font-display font-bold leading-none mb-2">
                      {format(date, 'dd')}
                    </div>
                    <div className="flex items-center text-muted-foreground text-sm font-medium mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(date, 'h:mm a')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {practice.durationMinutes} mins
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-display font-bold uppercase tracking-wide">
                            {team ? team.name : 'Unknown Team'}
                          </h3>
                          <Badge variant={practice.status === 'completed' ? 'secondary' : practice.status === 'cancelled' ? 'destructive' : 'default'} className="uppercase text-[10px] tracking-wider">
                            {practice.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(practice)} data-testid={`button-edit-practice-${practice.id}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(practice.id)} data-testid={`button-delete-practice-${practice.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">Focus:</span>
                        <span className="text-foreground font-medium">{practice.focus}</span>
                      </div>
                      
                      {practice.drills && (
                        <div className="bg-background/50 border border-border/50 rounded-md p-3 mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Script</p>
                          <p className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">{practice.drills}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
