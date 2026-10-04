import { db } from "@/prisma/db";

type UpdateArgs =
    Parameters<typeof db.orm.public.DeparturePricing.update>;

type UpdateArg1 = UpdateArgs[0];
type UpdateArg2 = UpdateArgs[1];

const testArg1: UpdateArg1 = undefined as never;
const testArg2: UpdateArg2 = undefined as never;