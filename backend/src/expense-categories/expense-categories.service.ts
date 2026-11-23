import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ExpenseCategory } from './expense-category.model';

const DEFAULT_CATEGORIES = ['TRAVEL', 'MEALS', 'SUPPLIES', 'ACCOMMODATION', 'OTHER'];

@Injectable()
export class ExpenseCategoriesService implements OnModuleInit {
  async onModuleInit() {
    await ExpenseCategory.bulkCreate(
      DEFAULT_CATEGORIES.map((code) => ({ code })),
      { ignoreDuplicates: true },
    );
  }

  list() {
    return ExpenseCategory.findAll({ order: [['code', 'ASC']] });
  }

  async create(name: string) {
    const code = name
      .trim()
      .replace(/[\s_]+/g, '_')
      .toUpperCase();
    if (code.length < 2 || code.length > 60 || !/[\p{L}\p{N}]/u.test(code)) {
      throw new BadRequestException(
        'Enter a category name of 2 to 60 characters containing a letter or number.',
      );
    }
    const [category] = await ExpenseCategory.findOrCreate({ where: { code } });
    return category;
  }

  async requireCode(code: string) {
    const category = await ExpenseCategory.findByPk(code);
    if (!category) throw new BadRequestException('Select an existing expense category.');
    return category.code;
  }
}
