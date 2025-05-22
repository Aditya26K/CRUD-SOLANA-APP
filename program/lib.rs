use anchor_lang::prelude::*;

declare_id!("");

#[program]
pub mod simple_curd {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        id: u64,
        merchant_name: String,
        amount: u64,) -> Result<()> {
         let expense_account = &mut ctx.accounts.expense_account;

        expense_account.id = id;
        expense_account.merchant_name = merchant_name;
        expense_account.amount = amount;
        expense_account.owner = *ctx.accounts.signer.key;

        msg!("Expense account initialized with ID: {}", expense_account.id);
        msg!("Owner: {}", expense_account.owner);
        Ok(())
    }

    pub fn update(
        ctx: Context<Update>,
        id: u64,
        merchant_name: String,
        amount: u64,) -> Result<()> {
        let expense_account = &mut ctx.accounts.expense_account;
        expense_account.id = id;
        expense_account.merchant_name = merchant_name;
        expense_account.amount = amount;
        msg!("Expense account updated with ID: {}", expense_account.id);
        msg!("Owner: {}", expense_account.owner);
        Ok(())
    }
    pub fn delete(ctx: Context<Delete>) -> Result<()> {
        let expense_account = &mut ctx.accounts.expense_account;
        msg!("Expense account deleted with ID: {}", expense_account.id);
        msg!("Owner: {}", expense_account.owner);
        Ok(())
    }
}



#[derive(Accounts)]
#[instruction(id : u64)]
pub struct Initialize<'info> {
     #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + 8 + 32 + 4 + 200,
        seeds = [b"expense", signer.key().as_ref(), id.to_le_bytes().as_ref()],
        bump,
    )]
    pub expense_account: Account<'info, ExpenseAccount>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(id : u64)]
pub struct Update<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"expense", signer.key().as_ref(), id.to_le_bytes().as_ref()],
        bump,
    )]
    pub expense_account: Account<'info, ExpenseAccount>,
    pub system_program: Program<'info, System>,

}


#[derive(Accounts)]
#[instruction(id : u64)]
pub struct Delete<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        close = signer,
        seeds = [b"expense", signer.key().as_ref(), id.to_le_bytes().as_ref()],
        bump,
    )]
    pub expense_account: Account<'info, ExpenseAccount>,
    pub system_program: Program<'info, System>,
}
#[account]
pub struct ExpenseAccount {
    pub id: u64,
    pub owner: Pubkey,
    pub merchant_name: String,
    pub amount: u64,
}
