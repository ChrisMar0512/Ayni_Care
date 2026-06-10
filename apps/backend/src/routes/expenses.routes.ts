import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authorize.middleware';
import { validate } from '../middleware/validate.middleware';
import { createExpenseSchema } from '../schemas/expense.schema';
import {
  listExpenses,
  createExpense,
  payExpenseSplit,
  deleteExpense,
} from '../controllers/expenses.controller';

const router = Router();

router.get('/', authenticate, requirePermission('expenses:read'), listExpenses);
router.post('/', authenticate, requirePermission('expenses:create'), validate(createExpenseSchema), createExpense);
router.patch('/:expenseId/splits/:splitId/pay', authenticate, requirePermission('expenses:create'), payExpenseSplit);
router.delete('/:id', authenticate, requirePermission('expenses:delete'), deleteExpense);

export default router;
