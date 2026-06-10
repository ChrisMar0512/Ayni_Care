import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { broadcast } from '../services/realtime.service';
import { CreateExpenseInput } from '../schemas/expense.schema';

// GET /api/expenses
export const listExpenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;

    const expenses = await prisma.expense.findMany({
      where: { familyId, deletedAt: null },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          include: { member: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses
export const createExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId, memberId } = req.user;
    const { title, amount, currency, category, date, receipt, notes, splits } =
      req.validatedBody as CreateExpenseInput;

    // Verify all split members belong to this family
    const memberIds = splits.map((s) => s.memberId);
    const members = await prisma.familyMember.findMany({
      where: { id: { in: memberIds }, familyId, isActive: true },
      select: { id: true },
    });

    if (members.length !== memberIds.length) {
      res.status(400).json({
        success: false,
        data: null,
        error: 'Uno o más miembros del split no pertenecen a esta familia',
      });
      return;
    }

    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          familyId,
          paidById: memberId,
          title,
          amount,
          currency,
          category,
          date: new Date(date),
          receipt,
          notes,
        },
      });

      await tx.expenseSplit.createMany({
        data: splits.map((s) => ({
          expenseId: newExpense.id,
          memberId: s.memberId,
          amount: s.amount,
        })),
      });

      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: {
            include: { member: { select: { id: true, name: true } } },
          },
        },
      });
    });

    await broadcast(familyId, 'expense:created', expense);

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/expenses/:expenseId/splits/:splitId/pay
export const payExpenseSplit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { expenseId, splitId } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!expense) {
      res.status(404).json({ success: false, data: null, error: 'Gasto no encontrado' });
      return;
    }

    const split = await prisma.expenseSplit.findFirst({
      where: { id: splitId, expenseId },
      select: { id: true, isPaid: true },
    });

    if (!split) {
      res.status(404).json({ success: false, data: null, error: 'Split no encontrado' });
      return;
    }

    if (split.isPaid) {
      res.status(400).json({ success: false, data: null, error: 'Este split ya fue pagado' });
      return;
    }

    const updatedSplit = await prisma.expenseSplit.update({
      where: { id: splitId },
      data: { isPaid: true, paidAt: new Date() },
      include: { member: { select: { id: true, name: true } } },
    });

    await broadcast(familyId, 'expense:updated', { expenseId, split: updatedSplit });

    res.json({ success: true, data: updatedSplit });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/:id — soft delete
export const deleteExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { familyId } = req.user;
    const { id } = req.params;

    const existing = await prisma.expense.findFirst({
      where: { id, familyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, data: null, error: 'Gasto no encontrado' });
      return;
    }

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await broadcast(familyId, 'expense:deleted', { id });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};
