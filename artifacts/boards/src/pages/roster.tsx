import { useState } from "react";
import { 
  useListPlayers, 
  useDeletePlayer,
  useListTeams,
  useCreatePlayer,
  useUpdatePlayer,
  getListPlayersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
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

const playerSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  position: z.string().min(1, "Required"),
  jerseyNumber: z.coerce.number().min(0, "Required"),
  teamId: z.coerce.number().min(1, "Required"),
  height: z.string().optional(),
  weight: z.coerce.number().optional(),
  graduationYear: z.coerce.number().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
});

export default function Roster() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const { data: players, isLoading } = useListPlayers();
  const { data: teams } = useListTeams();
  const deletePlayer = useDeletePlayer();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof playerSchema>>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      position: "",
      jerseyNumber: 0,
      teamId: 0,
      status: "active"
    }
  });

  const filteredPlayers = players?.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    p.position.toLowerCase().includes(search.toLowerCase()) ||
    p.jerseyNumber.toString().includes(search)
  ) || [];

  const handleEdit = (player: any) => {
    setEditingPlayer(player);
    form.reset({
      ...player,
      height: player.height || undefined,
      weight: player.weight || undefined,
      graduationYear: player.graduationYear || undefined,
      notes: player.notes || undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this player?")) {
      deletePlayer.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
          toast({ title: "Player deleted" });
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof playerSchema>) => {
    if (editingPlayer) {
      updatePlayer.mutate({ id: editingPlayer.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
          toast({ title: "Player updated" });
          setIsDialogOpen(false);
          setEditingPlayer(null);
        }
      });
    } else {
      createPlayer.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
          toast({ title: "Player created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Roster Management</h1>
          <p className="text-muted-foreground mt-1">Manage personnel and assignments across all levels.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPlayer(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider font-semibold" data-testid="button-add-player">
              <Plus className="mr-2 h-4 w-4" /> Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-wide text-xl">
                {editingPlayer ? "Edit Player" : "New Player"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="position" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="PG">PG</SelectItem>
                          <SelectItem value="SG">SG</SelectItem>
                          <SelectItem value="SF">SF</SelectItem>
                          <SelectItem value="PF">PF</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="jerseyNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jersey #</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="teamId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value ? field.value.toString() : ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {teams?.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.level})</SelectItem>
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="injured">Injured</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updatePlayer.isPending || createPlayer.isPending} data-testid="button-save-player">
                    {editingPlayer ? "Save Changes" : "Create Player"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm bg-card/50">
        <CardHeader className="pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search roster..." 
              className="pl-9 bg-background border-border/50 focus-visible:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-roster"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[80px] font-display uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="font-display uppercase tracking-wider text-muted-foreground">Name</TableHead>
                <TableHead className="font-display uppercase tracking-wider text-muted-foreground">Pos</TableHead>
                <TableHead className="font-display uppercase tracking-wider text-muted-foreground">Team</TableHead>
                <TableHead className="font-display uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-right font-display uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i} className="border-border/50">
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => {
                  const team = teams?.find(t => t.id === player.teamId);
                  return (
                    <TableRow key={player.id} className="border-border/50 hover:bg-muted/10 group">
                      <TableCell className="font-mono text-muted-foreground text-lg">{player.jerseyNumber.toString().padStart(2, '0')}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        {player.lastName}, {player.firstName}
                      </TableCell>
                      <TableCell>
                        <span className="bg-muted/30 text-muted-foreground px-2 py-1 rounded text-xs font-bold tracking-wider">
                          {player.position}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {team ? `${team.name} (${team.level})` : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={player.status === 'active' ? 'default' : player.status === 'injured' ? 'destructive' : 'secondary'} 
                          className="font-display uppercase tracking-wider text-[10px]">
                          {player.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(player)} data-testid={`button-edit-${player.id}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(player.id)} data-testid={`button-delete-${player.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
