import { paiseToRupees } from '../domain/money'
import type { Paise } from '../domain/money'
import type { Group } from '../model/group'
import { getGroupBalances, getGroupSettlements } from '../model/settlement'
import type { GroupBalance } from '../model/settlement'

interface SettlementSectionsProps {
  group: Group
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

function balanceLabel(balancePaise: Paise): string {
  if (balancePaise > 0) {
    return `is owed ₹${paiseToRupees(balancePaise)}`
  }
  return `owes ₹${paiseToRupees(Math.abs(balancePaise))}`
}

function BalanceAmount({ balancePaise }: { balancePaise: Paise }) {
  if (balancePaise === 0) {
    return <span className="shrink-0 text-sm text-neutral-400">settled</span>
  }
  const positive = balancePaise > 0
  return (
    <span className={`shrink-0 text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      {balanceLabel(balancePaise)}
    </span>
  )
}

function emptyStateMessage(balances: GroupBalance[]): string {
  if (balances.some((balance) => balance.balancePaise !== 0)) {
    return 'No transfers needed.'
  }
  return 'Everyone is settled up.'
}

export function SettlementSections({ group }: SettlementSectionsProps) {
  const balances = getGroupBalances(group)
  const settlements = getGroupSettlements(group)

  if (group.expenses.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col">
        <h2 className="text-sm font-medium text-neutral-700">Balances</h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {balances.map((balance) => (
            <li key={balance.personId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                {initialsOf(balance.name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-neutral-900">{balance.name}</span>
              <BalanceAmount balancePaise={balance.balancePaise} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col">
        <h2 className="text-sm font-medium text-neutral-700">Suggested transfers to settle up</h2>
        {settlements.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">{emptyStateMessage(balances)}</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
            {settlements.map((settlement) => (
              <li
                key={`${settlement.fromId}-${settlement.toId}-${settlement.amountPaise}`}
                className="flex items-center gap-2 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-neutral-900">{settlement.fromName}</span>
                <span className="shrink-0 text-neutral-400" aria-hidden="true">
                  →
                </span>
                <span className="min-w-0 flex-1 truncate text-neutral-900">{settlement.toName}</span>
                <span className="shrink-0 text-sm font-medium text-neutral-700">
                  ₹{paiseToRupees(settlement.amountPaise)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}