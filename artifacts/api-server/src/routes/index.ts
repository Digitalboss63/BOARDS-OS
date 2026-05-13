import { Router, type IRouter } from "express";
import healthRouter from "./health";
import teamsRouter from "./teams";
import playersRouter from "./players";
import practicesRouter from "./practices";
import gamesRouter from "./games";
import scoutingReportsRouter from "./scouting-reports";
import dashboardRouter from "./dashboard";
import systemRouter from "./system";

const router: IRouter = Router();

router.use(healthRouter);
router.use(teamsRouter);
router.use(playersRouter);
router.use(practicesRouter);
router.use(gamesRouter);
router.use(scoutingReportsRouter);
router.use(dashboardRouter);
router.use(systemRouter);

export default router;
