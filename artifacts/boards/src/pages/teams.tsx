import { useState } from "react";
import { 
  useListTeams, 
  useCreateTeam, 
  useUpdateTeam, 
  useDeleteTeam,
  getListTeamsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
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

const teamSchema = z.object({
  name: z.string().min(1, "Required"),
  level: z.string().min(1, "Required"),
  season: z.string().min(1, "Required"),
  record: z.string().default("0-0"),
  coachName: z.string().optional(),
  notes: z.string().optional(),
});

export default function Teams() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  
  const { data: teams, isLoading } = useListTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof teamSchema>>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      level: "Varsity",
      season: new Date().getFullYear().toString(),
      record: "0-0",
      coachName: "",
      notes: ""
    }
  });

  const handleEdit = (team: any) => {
    setEditingTeam(team);
    form.reset({
      ...team,
      coachName: team.coachName || undefined,
      notes: team.notes || undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteTeam.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          toast({ title: "Team deleted" });
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof teamSchema>) => {
    if (editingTeam) {
      updateTeam.mutate({ id: editingTeam.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          toast({ title: "Team updated" });
          setIsDialogOpen(false);
          setEditingTeam(null);
        }
      });
    } else {
      createTeam.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          toast({ title: "Team created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-1">Configure program teams, levels, and coaching staff.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTeam(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider font-semibold" data-testid="button-add-team">
              <Plus className="mr-2 h-4 w-4" /> Add Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-wide text-xl">
                {editingTeam ? "Edit Team" : "New Team"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="level" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Varsity">Varsity</SelectItem>
                          <SelectItem value="JV">JV</SelectItem>
                          <SelectItem value="Freshman">Freshman</SelectItem>
                          <SelectItem value="AAU">AAU</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="season" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="record" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Record</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. 0-0" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="coachName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coach</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updateTeam.isPending || createTeam.isPending} data-testid="button-save-team">
                    {editingTeam ? "Save Changes" : "Create Team"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="border-border/50 shadow-sm bg-card/50">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))
        ) : teams?.map((team) => (
          <Card key={team.id} className="border-border/50 shadow-sm bg-card/50 hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-display font-bold">{team.name}</CardTitle>
                  <CardDescription className="text-muted-foreground mt-1 uppercase tracking-wider text-xs font-semibold">
                    {team.level} • {team.season}
                  </CardDescription>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(team)} data-testid={`button-edit-team-${team.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(team.id)} data-testid={`button-delete-team-${team.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center bg-muted/20 p-3 rounded-md border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Record</p>
                  <p className="text-2xl font-display font-bold text-foreground leading-none">{team.record}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Head Coach</p>
                  <p className="font-medium text-foreground">{team.coachName || 'TBA'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {!isLoading && teams?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border/50 border-dashed">
          No teams found. Create a team to get started.
        </div>
      )}
    </div>
  );
}
