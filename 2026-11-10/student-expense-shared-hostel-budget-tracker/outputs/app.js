const PEOPLE = [
  { name: 'Alex Morgan', short: 'Alex', initial: 'A', role: 'You · Admin', cls: 'avatar-me' },
  { name: 'Jordan Lee', short: 'Jordan', initial: 'J', role: 'Roommate', cls: 'avatar-jo' },
  { name: 'Sam Rivera', short: 'Sam', initial: 'S', role: 'Roommate', cls: 'avatar-sam' },
  { name: 'Riley Chen', short: 'Riley', initial: 'R', role: 'Roommate', cls: 'avatar-r' },
];

const CATEGORIES = {
  Food: { icon: '◒', color: '#f4e8d9', ink: '#a8794b', budget: 12000 },
  Rent: { icon: '⌂', color: '#e8ebdf', ink: '#657c5d', budget: 40000 },
  Utilities: { icon: 'ϟ', color: '#e4edf0', ink: '#63808a', budget: 6000 },
  'Study Material': { icon: '▤', color: '#f1e7ef', ink: '#946c8c', budget: 4000 },
  Entertainment: { icon: '♫', color: '#f2e6df', ink: '#a8765b', budget: 5000 },
  Other: { icon: '✳', color: '#eeefe9', ink: '#777d6e', budget: 3000 },
};

const STORAGE_KEY = 'commonplace-expenses-v1';
let state = loadState();
let selectedMonth = new Date().toISOString().slice(0, 7);
let toastTimer;

function defaultBudgets() {
  return Object.fromEntries(
    Object.entries(CATEGORIES).map(([name, category]) => [name, category.budget]),
  );
}

function sampleExpenses() {
  const now = new Date();
  const thisMonth = (day) => {
    const date = new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()));
    return date.toISOString().slice(0, 10);
  };
  const previousMonth = (monthsAgo, day) => {
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
    return date.toISOString().slice(0, 10);
  };

  return [
    {
      id: 'sample-1',
      title: 'Groceries at the market',
      amount: 2840,
      category: 'Food',
      payer: 0,
      date: thisMonth(2),
      shared: true,
      shares: [710, 710, 710, 710],
    },
    {
      id: 'sample-2',
      title: 'Electricity bill',
      amount: 1760,
      category: 'Utilities',
      payer: 1,
      date: thisMonth(4),
      shared: true,
      shares: [440, 440, 440, 440],
    },
    {
      id: 'sample-3',
      title: 'Rice and pantry restock',
      amount: 1960,
      category: 'Food',
      payer: 2,
      date: thisMonth(6),
      shared: true,
      shares: [490, 490, 490, 490],
    },
    { id: 'sample-4', title: 'Course reader printouts', amount: 420, category: 'Study Material', payer: 3, date: thisMonth(8), shared: false },
    {
      id: 'sample-5',
      title: 'Internet bill',
      amount: 899,
      category: 'Utilities',
      payer: 0,
      date: thisMonth(10),
      shared: true,
      shares: [224.75, 224.75, 224.75, 224.75],
    },
    {
      id: 'sample-6',
      title: 'Groceries and cleaning stuff',
      amount: 2310,
      category: 'Food',
      payer: 1,
      date: previousMonth(1, 12),
      shared: true,
      shares: [577.5, 577.5, 577.5, 577.5],
    },
    {
      id: 'sample-7',
      title: 'Dinner after exams',
      amount: 1480,
      category: 'Entertainment',
      payer: 2,
      date: previousMonth(2, 18),
      shared: true,
      shares: [370, 370, 370, 370],
    },
  ];
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.expenses)) {
      return { ...saved, budgets: { ...defaultBudgets(), ...saved.budgets } };
    }
  } catch {
    // Start with example entries if there is no usable saved data.
  }

  return { expenses: sampleExpenses(), budgets: defaultBudgets() };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function monthExpenses() {
  return state.expenses.filter((expense) => expense.date?.slice(0, 7) === selectedMonth);
}

function monthTotal() {
  return monthExpenses().reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function render() {
  renderMonthOptions();
  renderSummary();
  renderChart();
  renderCategories();
  renderTransactions();
  renderRoommates();
}

function renderMonthOptions() {
  const select = document.querySelector('#monthSelect');
  const months = new Set([
    new Date().toISOString().slice(0, 7),
    ...state.expenses.map((expense) => expense.date.slice(0, 7)),
    selectedMonth,
  ]);

  select.innerHTML = [...months]
    .sort()
    .reverse()
    .map((month) => {
      const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      return `<option value="${month}">${label}</option>`;
    })
    .join('');
  select.value = selectedMonth;
}

function renderSummary() {
  const expenses = monthExpenses();
  const spent = monthTotal();
  const myShare = expenses.reduce((sum, expense) => {
    if (expense.shared) return sum + (expense.shares?.[0] ?? Number(expense.amount) / 4);
    return sum + (expense.payer === 0 ? Number(expense.amount) : 0);
  }, 0);
  const owedToMe = expenses.reduce((sum, expense) => {
    if (expense.shared && expense.payer === 0) {
      return sum + Number(expense.amount) - (expense.shares?.[0] ?? Number(expense.amount) / 4);
    }
    return sum;
  }, 0);
  const totalBudget = Object.values(state.budgets).reduce((sum, amount) => sum + Number(amount), 0);
  const budgetPercent = totalBudget ? Math.round((spent / totalBudget) * 100) : 0;
  const budgetBar = document.querySelector('#budgetTrack');

  document.querySelector('#totalSpend').textContent = money(spent);
  document.querySelector('#yourShare').textContent = money(myShare);
  document.querySelector('#youOwed').textContent = money(owedToMe);
  document.querySelector('#owedCaption').textContent = owedToMe
    ? 'From shared expenses you paid for'
    : 'All settled up';
  document.querySelector('#budgetUsed').textContent = money(spent);
  document.querySelector('#budgetLimit').textContent = money(totalBudget);
  document.querySelector('#budgetPercent').textContent = `${budgetPercent}%`;
  document.querySelector('#budgetCaption').textContent = budgetPercent >= 100
    ? 'You’re over your monthly budget'
    : `${money(Math.max(0, totalBudget - spent))} left to spend`;
  document.querySelector('#navCount').textContent = state.expenses.length;
  document.querySelector('#chartTotal').textContent = money(yearTotal());

  budgetBar.style.width = `${Math.min(budgetPercent, 100)}%`;
  budgetBar.className = budgetPercent >= 90 ? 'danger' : budgetPercent >= 75 ? 'warning' : '';
  renderMiniBars();
}

function renderMiniBars() {
  const year = Number(selectedMonth.slice(0, 4));
  const month = Number(selectedMonth.slice(5, 7));
  const totals = Array.from({ length: 9 }, (_, index) => {
    const date = new Date(year, month - 9 + index, 1);
    const key = date.toISOString().slice(0, 7);
    return state.expenses
      .filter((expense) => expense.date.slice(0, 7) === key)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  });
  const peak = Math.max(1, ...totals);

  document.querySelector('#miniBars').innerHTML = totals
    .map((total) => `<i style="height:${Math.max(4, Math.round((total / peak) * 27))}px"></i>`)
    .join('');
}

function yearTotal() {
  const year = selectedMonth.slice(0, 4);
  return state.expenses
    .filter((expense) => expense.date.startsWith(year))
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function renderChart() {
  const year = Number(selectedMonth.slice(0, 4));
  const totals = Array.from({ length: 12 }, (_, index) =>
    state.expenses
      .filter((expense) => expense.date.slice(0, 4) === String(year)
        && Number(expense.date.slice(5, 7)) === index + 1)
      .reduce((sum, expense) => sum + Number(expense.amount), 0),
  );
  const peak = Math.max(10000, ...totals);
  const points = totals.map((total, index) => `${index * 63.5 + 16},${175 - (total / peak) * 155}`);
  const svg = document.querySelector('#monthlyChart');

  svg.innerHTML = `
    <defs>
      <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#8eae8e" stop-opacity=".24" />
        <stop offset="1" stop-color="#8eae8e" stop-opacity="0" />
      </linearGradient>
    </defs>
    <polygon points="16,180 ${points.join(' ')} 714,180" fill="url(#area)" />
    <polyline points="${points.join(' ')}" fill="none" stroke="#779a7e"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    ${totals.map((total, index) => {
      if (!total) return '';
      return `<circle cx="${index * 63.5 + 16}" cy="${175 - (total / peak) * 155}"
        r="3" fill="#fff" stroke="#779a7e" stroke-width="2" />`;
    }).join('')}
  `;

  document.querySelector('#monthLabels').innerHTML =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      .map((name) => `<span>${name}</span>`)
      .join('');
}

function renderCategories() {
  const expenses = monthExpenses();
  document.querySelector('#categoryList').innerHTML = Object.entries(CATEGORIES)
    .filter(([name]) => name !== 'Other')
    .map(([name, category]) => {
      const spent = expenses
        .filter((expense) => expense.category === name)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const limit = Number(state.budgets[name] || 0);
      const percent = limit ? (spent / limit) * 100 : 0;
      const status = percent >= 100 ? 'danger' : percent >= 75 ? 'warning' : '';

      return `
        <div class="category-row">
          <div class="category-name">
            <span class="cat-icon" style="background:${category.color};color:${category.ink}">${category.icon}</span>
            ${name}
          </div>
          <div class="category-amount">${money(spent)} <small>/ ${money(limit)}</small></div>
          <div class="category-meter"><span class="${status}" style="width:${Math.min(100, percent)}%"></span></div>
        </div>
      `;
    })
    .join('');
}

function renderTransactions() {
  const expenses = monthExpenses()
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const empty = expenses.length === 0;

  document.querySelector('#emptyTransactions').style.display = empty ? 'block' : 'none';
  document.querySelector('#transactionRows').innerHTML = expenses.map((expense) => {
    const category = CATEGORIES[expense.category] || CATEGORIES.Other;
    const payer = PEOPLE[expense.payer] || PEOPLE[0];

    return `
      <div class="transaction-row">
        <div class="transaction-name">
          <span class="tx-icon" style="background:${category.color};color:${category.ink}">${category.icon}</span>
          <div><strong>${escapeHtml(expense.title)}</strong>
            <span class="tx-sub">${expense.shared ? 'Shared with 4' : 'Personal expense'}</span>
          </div>
        </div>
        <div class="payer-cell"><i class="avatar ${payer.cls}">${payer.initial}</i>${payer.short}</div>
        <span><i class="category-pill">${escapeHtml(expense.category)}</i></span>
        <span class="tx-date">${formatDate(expense.date)}</span>
        <span class="tx-amount">${money(expense.amount)}</span>
      </div>
    `;
  }).join('');
}

function renderRoommates() {
  const expenses = monthExpenses();
  const balances = PEOPLE.map((_, personIndex) => expenses.reduce((balance, expense) => {
    if (!expense.shared) return balance + (expense.payer === personIndex ? Number(expense.amount) : 0);
    const share = expense.shares?.[personIndex] ?? Number(expense.amount) / 4;
    return balance + (expense.payer === personIndex ? Number(expense.amount) - share : -share);
  }, 0));

  document.querySelector('#roommateList').innerHTML = PEOPLE.map((person, index) => {
    const balance = balances[index];
    const status = Math.abs(balance) < 1
      ? 'Settled'
      : balance > 0 ? `gets ${money(balance)}` : `owes ${money(-balance)}`;

    return `
      <div class="roommate-row">
        <i class="avatar ${person.cls}">${person.initial}</i>
        <div>
          <div class="roommate-name">${person.short}${index === 0 ? ' (you)' : ''}</div>
          <div class="roommate-role">${person.role}</div>
        </div>
        <span class="roommate-status ${balance < -1 ? 'owes' : ''}">${status}</span>
      </div>
    `;
  }).join('');

  const owingCount = balances.filter((balance) => balance < -1).length;
  document.querySelector('#settleText').textContent = owingCount
    ? `${owingCount} housemate${owingCount === 1 ? '' : 's'} still need to settle up.`
    : 'Everyone’s square for now.';
}

function escapeHtml(value = '') {
  const characters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (character) => characters[character]);
}

function updateShareFields() {
  const shared = document.querySelector('[name=shared]').checked;
  const custom = shared && document.querySelector('#splitMethod').value === 'custom';
  const box = document.querySelector('#customShares');
  document.querySelector('#splitMethodLabel').hidden = !shared;
  box.hidden = !custom;

  if (!custom) return;

  const amount = Number(document.querySelector('[name=amount]').value) || 0;
  box.innerHTML = PEOPLE.map((person) => `
    <div class="custom-share-row">
      <span>${person.short}'s share</span>
      <input class="share-input" type="number" min="0" step="0.01"
        value="${(amount / 4).toFixed(2)}" aria-label="${person.short} share" />
    </div>
  `).join('') + `<div class="custom-share-total">Shares must total ${money(amount)}</div>`;

  box.querySelectorAll('.share-input').forEach((input) => {
    input.addEventListener('input', () => {
      const total = [...box.querySelectorAll('.share-input')]
        .reduce((sum, field) => sum + Number(field.value || 0), 0);
      const note = box.querySelector('.custom-share-total');
      note.classList.toggle('invalid', Math.abs(total - amount) > 0.009);
      note.textContent = `Shares total ${money(total)} · bill ${money(amount)}`;
    });
  });
}

function openExpenseModal(title = 'Add an expense', description = 'Add the amount and who paid. We’ll work out each share.') {
  document.querySelector('#modalTitle').textContent = title;
  document.querySelector('#modalDescription').textContent = description;
  document.querySelector('#payerSelect').innerHTML = PEOPLE
    .map((person, index) => `<option value="${index}">${person.short}</option>`)
    .join('');

  const form = document.querySelector('#expenseForm');
  form.reset();
  form.elements.date.value = new Date().toISOString().slice(0, 10);
  document.querySelector('#modalBackdrop').classList.add('open');
  document.querySelector('#modalBackdrop').setAttribute('aria-hidden', 'false');
  updateShareFields();
  setTimeout(() => form.elements.title.focus(), 80);
}

function closeExpenseModal() {
  document.querySelector('#modalBackdrop').classList.remove('open');
  document.querySelector('#modalBackdrop').setAttribute('aria-hidden', 'true');
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelector('#expenseForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const amount = Number(form.get('amount'));
  const shared = form.get('shared') === 'on';
  const shares = shared
    ? form.get('splitMethod') === 'custom'
      ? [...document.querySelectorAll('.share-input')].map((input) => Number(input.value || 0))
      : PEOPLE.map(() => Math.floor(amount * 100 / 4) / 100)
    : null;

  if (shared && Math.abs(shares.reduce((sum, share) => sum + share, 0) - amount) > 0.009) {
    showToast('Custom shares must add up to the full bill');
    return;
  }

  state.expenses.push({
    id: crypto.randomUUID?.() || String(Date.now()),
    title: form.get('title').trim(),
    amount,
    category: form.get('category'),
    payer: Number(form.get('payer')),
    date: form.get('date'),
    shared,
    shares,
  });
  selectedMonth = form.get('date').slice(0, 7);
  saveState();
  render();
  closeExpenseModal();
  showToast('Expense added to the household');
});

document.querySelector('#addExpenseBtn').onclick = () => openExpenseModal();
document.querySelector('#emptyAdd').onclick = () => openExpenseModal();
document.querySelector('#modalClose').onclick = closeExpenseModal;
document.querySelector('#cancelModal').onclick = closeExpenseModal;
document.querySelector('#splitBtn').onclick = () => openExpenseModal(
  'Split a bill',
  'Enter a bill and we’ll work out what each person owes.',
);
document.querySelector('#monthSelect').onchange = (event) => {
  selectedMonth = event.target.value;
  render();
};
document.querySelector('#modalBackdrop').addEventListener('click', (event) => {
  if (event.target.id === 'modalBackdrop') closeExpenseModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeExpenseModal();
});
document.querySelector('[name=shared]').addEventListener('change', updateShareFields);
document.querySelector('#splitMethod').addEventListener('change', updateShareFields);
document.querySelector('[name=amount]').addEventListener('input', () => {
  if (document.querySelector('#splitMethod').value === 'custom') updateShareFields();
});

document.querySelector('#editBudgets').onclick = () => {
  const current = Object.entries(state.budgets)
    .map(([name, amount]) => `${name}: ₹${amount}`)
    .join('\n');
  const answer = prompt(`Set a monthly amount for each category.\n\n${current}`);
  if (answer === null) return;

  const amounts = answer.match(/\d[\d,]*/g);
  if (!amounts?.length) return;
  Object.keys(state.budgets).forEach((name, index) => {
    if (amounts[index]) state.budgets[name] = Number(amounts[index].replaceAll(',', ''));
  });
  saveState();
  render();
  showToast('Monthly budgets updated');
};

document.querySelector('#budgetMore').onclick = () => document.querySelector('#editBudgets').click();
document.querySelector('#addCategory').onclick = () => showToast('All six spending categories are ready to use');
document.querySelector('#settingsBtn').onclick = () => showToast('Your expenses are saved in this browser only');

document.querySelector('#exportBtn').onclick = () => {
  const backup = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(backup);
  link.download = `commonplace-backup-${selectedMonth}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Household backup downloaded');
};

document.querySelector('#importBtn').onclick = () => document.querySelector('#importFile').click();
document.querySelector('#importFile').onchange = async (event) => {
  try {
    const backup = JSON.parse(await event.target.files[0].text());
    if (!Array.isArray(backup.expenses)) throw new Error('Invalid backup');
    state = { expenses: backup.expenses, budgets: { ...defaultBudgets(), ...backup.budgets } };
    saveState();
    render();
    showToast('Backup imported successfully');
  } catch {
    showToast('Could not read that backup file');
  }
  event.target.value = '';
};

document.querySelector('#clearData').onclick = (event) => {
  event.preventDefault();
  if (!confirm('Reset all saved expenses and budgets for this browser?')) return;
  state = { expenses: [], budgets: defaultBudgets() };
  selectedMonth = new Date().toISOString().slice(0, 7);
  saveState();
  render();
  showToast('Demo data reset');
};

render();
