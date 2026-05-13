import { useState } from "react";
import { 
  useListGames, 
  useCreateGame, 
  useUpdateGame,
  useListTeams,
  getListGamesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, MapPin } from "lucide-react";
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

const gameSchema = z.object({
  teamId: z.coerce.number().min(1, "Required"),
  opponent: z.string().min(1, "Required"),
  scheduledAt: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  isHome: z.boolean().default(true),
  result: z.string().default("upcoming"),
  scoreUs: z.coerce.number().optional().nullable(),
  scoreThem: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

export default function Games() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  
  const { data: games, isLoading } = useListGames();
  const { data: teams } = useListTeams();
  
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof gameSchema>>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      teamId: 0,
      opponent: "",
      scheduledAt: new Date().toISOString().slice(0, 16),
      location: "",
      isHome: true,
      result: "upcoming",
      scoreUs: null,
      scoreThem: null,
      notes: ""
    }
  });

  const handleEdit = (game: any) => {
    setEditingGame(game);
    form.reset({
      ...game,
      scheduledAt: new Date(game.scheduledAt).toISOString().slice(0, 16),
      scoreUs: game.scoreUs,
      scoreThem: game.scoreThem,
      notes: game.notes || undefined,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof gameSchema>) => {
    const payload = {
      ...values,
      scheduledAt: new Date(values.scheduledAt).toISOString()
    };
    
    // Auto-determine result based on score if not upcoming
    if (values.result !== 'upcoming' && values.scoreUs !== null && values.scoreThem !== null && values.scoreUs !== undefined && values.scoreThem !== undefined) {
      if (values.scoreUs > values.scoreThem) payload.result = 'win';
      else if (values.scoreUs < values.scoreThem) payload.result = 'loss';
    }
    
    if (editingGame) {
      updateGame.mutate({ id: editingGame.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
          toast({ title: "Game updated" });
          setIsDialogOpen(false);
          setEditingGame(null);
        }
      });
    } else {
      createGame.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
          toast({ title: "Game created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Game Log</h1>
          <p className="text-muted-foreground mt-1">Schedule, results, and game records.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingGame(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="font-display uppercase tracking-wider font-semibold" data-testid="button-add-game">
              <Plus className="mr-2 h-4 w-4" /> Add Game
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-wide text-xl">
                {editingGame ? "Edit Game" : "New Game"}
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
                  <FormField control={form.control} name="opponent" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opponent</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
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
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="isHome" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home/Away</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === 'true')} defaultValue={field.value ? 'true' : 'false'}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="true">Home</SelectItem>
                          <SelectItem value="false">Away</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="result" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="win">Win</SelectItem>
                          <SelectItem value="loss">Loss</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                {form.watch("result") !== "upcoming" && (
                  <div className="grid grid-cols-2 gap-4 p-4 border border-border/50 rounded-md bg-muted/10">
                    <FormField control={form.control} name="scoreUs" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Our Score</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scoreThem" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opponent Score</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
                
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updateGame.isPending || createGame.isPending} data-testid="button-save-game">
                    {editingGame ? "Save Changes" : "Add Game"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm bg-card/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-display uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="font-display uppercase tracking-wider text-muted-foreground">Matchup</TableHead>
                <TableHead className="font-display uppercase tracking-wider text-muted-foreground">Location</TableHead>
                <TableHead className="text-center font-display uppercase tracking-wider text-muted-foreground">Result</TableHead>
                <TableHead className="text-center font-display uppercase tracking-wider text-muted-foreground">Score</TableHead>
                <TableHead className="text-right font-display uppercase tracking-wider text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i} className="border-border/50">
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : games?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No games found.
                  </TableCell>
                </TableRow>
              ) : (
                games?.map((game) => {
                  const team = teams?.find(t => t.id === game.teamId);
                  const date = new Date(game.scheduledAt);
                  
                  return (
                    <TableRow key={game.id} className="border-border/50 hover:bg-muted/10 group">
                      <TableCell>
                        <div className="font-medium text-foreground">{format(date, 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{team?.name || 'Unknown'}</span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase">{game.isHome ? 'VS' : '@'}</span>
                          <span className="font-bold text-foreground">{game.opponent}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {game.location}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {game.result === 'upcoming' ? (
                          <span className="text-xs font-display uppercase tracking-widest text-muted-foreground">Upcoming</span>
                        ) : (
                          <Badge variant={game.result === 'win' ? 'default' : 'destructive'} 
                            className="font-display uppercase tracking-wider w-16 justify-center">
                            {game.result}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-lg">
                        {game.result !== 'upcoming' && game.scoreUs !== null && game.scoreThem !== null ? (
                          <span>{game.scoreUs} - {game.scoreThem}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEdit(game)} data-testid={`button-edit-game-${game.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
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
