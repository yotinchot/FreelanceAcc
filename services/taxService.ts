
export interface PersonalTaxParams {
  totalIncome: number;
  expenseType: 'flat' | 'actual';
  actualExpense?: number;
  deductions: {
    socialSecurity: number; // max 9000
    lifeInsurance: number; // max 100,000
    providentFund: number; // max 15% of wage
    donation: number; // max 10% of net income
    other: number;
  };
  whtAmount: number;
}

export interface CorporateTaxParams {
  totalRevenue: number;
  totalExpenses: number;
  isSME: boolean;
}

export interface PersonalTaxResult {
  totalIncome: number;
  expenseAmount: number;
  totalDeductions: number;
  netIncome: number;
  taxBeforeWht: number;
  whtCredit: number;
  taxPayable: number;
  avgTaxRate: number;
  steps: {
    limit: number;
    rate: number;
    amount: number;
  }[];
}

// Calculate Tax from Net Income directly (Helper)
export const calculateTaxFromNet = (netIncome: number): number => {
    const taxSteps = [
        { limit: 150000, rate: 0 },
        { limit: 300000, rate: 0.05 },
        { limit: 500000, rate: 0.10 },
        { limit: 750000, rate: 0.15 },
        { limit: 1000000, rate: 0.20 },
        { limit: 2000000, rate: 0.25 },
        { limit: 5000000, rate: 0.30 },
        { limit: Infinity, rate: 0.35 }
    ];

    let tax = 0;
    let remaining = netIncome;
    let previousLimit = 0;

    for (const step of taxSteps) {
        const width = step.limit - previousLimit;
        const incomeInStep = step.limit === Infinity ? remaining : Math.min(Math.max(0, remaining), width);
        
        if (incomeInStep > 0) {
            tax += incomeInStep * step.rate;
            remaining -= incomeInStep;
        }
        previousLimit = step.limit;
        if (remaining <= 0) break;
    }
    return tax;
};

export const calculatePersonalTax = (params: PersonalTaxParams): PersonalTaxResult => {
    const { totalIncome, expenseType, actualExpense, deductions, whtAmount } = params;

    // 1. Expenses
    let expenseAmount = 0;
    if (expenseType === 'flat') {
        // 60% but not exceeding 600,000 Baht
        expenseAmount = Math.min(totalIncome * 0.6, 600000);
    } else {
        expenseAmount = actualExpense || 0;
    }

    // 2. Deductions
    const personalDeduction = 60000;
    const socialSecurity = Math.min(deductions.socialSecurity, 9000);
    const lifeInsurance = Math.min(deductions.lifeInsurance, 100000);
    
    const initialTotalDeductions = 
        personalDeduction + 
        socialSecurity + 
        lifeInsurance + 
        deductions.providentFund + 
        deductions.other;

    let netIncomeBeforeDonation = Math.max(0, totalIncome - expenseAmount - initialTotalDeductions);
    
    // Donation (max 10% of remaining income)
    const maxDonation = netIncomeBeforeDonation * 0.1;
    const allowedDonation = Math.min(deductions.donation, maxDonation);
    
    const totalDeductions = initialTotalDeductions + allowedDonation;
    const netIncome = Math.max(0, totalIncome - expenseAmount - totalDeductions);

    // 3. Tax Calculation
    const tax = calculateTaxFromNet(netIncome);
    
    // Generate Steps for UI
    const taxSteps = [
        { limit: 150000, rate: 0 },
        { limit: 300000, rate: 0.05 },
        { limit: 500000, rate: 0.10 },
        { limit: 750000, rate: 0.15 },
        { limit: 1000000, rate: 0.20 },
        { limit: 2000000, rate: 0.25 },
        { limit: 5000000, rate: 0.30 },
        { limit: Infinity, rate: 0.35 }
    ];
    const calculatedSteps = [];
    let remainingIncome = netIncome;
    let previousLimit = 0;
    
    for (const step of taxSteps) {
        const width = step.limit - previousLimit;
        const incomeInStep = step.limit === Infinity ? remainingIncome : Math.min(Math.max(0, remainingIncome), width);
        
        if (incomeInStep > 0) {
             calculatedSteps.push({ limit: step.limit, rate: step.rate, amount: incomeInStep * step.rate });
             remainingIncome -= incomeInStep;
        } else {
             calculatedSteps.push({ limit: step.limit, rate: step.rate, amount: 0 });
        }
        previousLimit = step.limit;
    }

    const taxPayable = tax - whtAmount;
    const avgTaxRate = totalIncome > 0 ? (tax / totalIncome) * 100 : 0;

    return {
        totalIncome,
        expenseAmount,
        totalDeductions,
        netIncome,
        taxBeforeWht: tax,
        whtCredit: whtAmount,
        taxPayable,
        avgTaxRate,
        steps: calculatedSteps
    };
};

export const calculateCorporateTax = (params: CorporateTaxParams) => {
    const { totalRevenue, totalExpenses, isSME } = params;
    const netProfit = Math.max(0, totalRevenue - totalExpenses);
    let tax = 0;
    const brackets = [];

    if (isSME) {
        const tier1Amount = Math.min(netProfit, 300000);
        brackets.push({ range: '0 - 300,000', rate: 0, amount: 0 });

        const tier2Amount = Math.min(Math.max(0, netProfit - 300000), 2700000);
        if (tier2Amount > 0) {
            const t2Tax = tier2Amount * 0.15;
            tax += t2Tax;
            brackets.push({ range: '300,001 - 3,000,000', rate: 15, amount: t2Tax });
        }

        const tier3Amount = Math.max(0, netProfit - 3000000);
        if (tier3Amount > 0) {
            const t3Tax = tier3Amount * 0.20;
            tax += t3Tax;
            brackets.push({ range: '> 3,000,000', rate: 20, amount: t3Tax });
        }

    } else {
        tax = netProfit * 0.20;
        brackets.push({ range: 'จากกำไรสุทธิ', rate: 20, amount: tax });
    }

    return {
        totalRevenue,
        totalExpenses,
        netProfit,
        tax,
        brackets
    };
};

// --- New Features Logic ---

export const calculateVatInfo = (yearlyIncome: number) => {
    const threshold = 1800000;
    const remaining = Math.max(0, threshold - yearlyIncome);
    const percent = Math.min(100, (yearlyIncome / threshold) * 100);
    let status: 'normal' | 'warning' | 'danger' = 'normal';
    if (yearlyIncome >= 1500000) status = 'warning';
    if (yearlyIncome >= 1700000) status = 'danger';
    if (yearlyIncome >= threshold) status = 'danger'; // Exceeded

    return { threshold, yearlyIncome, remaining, percent, status };
};

export const compareExpenseMethods = (annualIncome: number, actualExpenses: number, deductions: number) => {
  const flatExpense = Math.min(annualIncome * 0.6, 600000);
  
  const netIncomeFlat = Math.max(0, annualIncome - flatExpense - deductions);
  const netIncomeActual = Math.max(0, annualIncome - actualExpenses - deductions);
  
  const taxFlat = calculateTaxFromNet(netIncomeFlat);
  const taxActual = calculateTaxFromNet(netIncomeActual);
  
  return {
    flatExpense,
    actualExpenses,
    netIncomeFlat,
    netIncomeActual,
    taxFlat,
    taxActual,
    flatRateIsBetter: taxFlat <= taxActual,
    savings: Math.abs(taxFlat - taxActual),
    breakEvenPoint: flatExpense,
    breakEvenPercentage: annualIncome > 0 ? (flatExpense / annualIncome * 100).toFixed(1) : 0
  };
};

export const analyzeTaxBracket = (netIncome: number) => {
    const brackets = [
        { min: 0, max: 150000, rate: 0 },
        { min: 150001, max: 300000, rate: 5 },
        { min: 300001, max: 500000, rate: 10 },
        { min: 500001, max: 750000, rate: 15 },
        { min: 750001, max: 1000000, rate: 20 },
        { min: 1000001, max: 2000000, rate: 25 },
        { min: 2000001, max: 5000000, rate: 30 },
        { min: 5000001, max: Infinity, rate: 35 }
    ];

    const current = brackets.find(b => netIncome >= b.min && netIncome <= b.max) || brackets[brackets.length-1];
    const currentIndex = brackets.indexOf(current);
    const next = brackets[currentIndex + 1];
    
    const incomeToNext = next ? next.min - netIncome : null;
    
    return {
        currentBracket: current,
        nextBracket: next,
        incomeToNext,
        isClose: incomeToNext !== null && incomeToNext < 50000 && incomeToNext > 0
    };
};

export const simulateJobImpact = (
    currentTotalIncome: number, 
    currentDeductions: number, 
    additionalGrossIncome: number
) => {
    // Current Scenario (Auto Flat Rate logic assumed for simplicity of simulator)
    const currentExpense = Math.min(currentTotalIncome * 0.6, 600000);
    const currentNet = Math.max(0, currentTotalIncome - currentExpense - currentDeductions);
    const currentTax = calculateTaxFromNet(currentNet);
    
    // New Scenario
    const newTotalIncome = currentTotalIncome + additionalGrossIncome;
    // Recalculate expense cap
    const newExpense = Math.min(newTotalIncome * 0.6, 600000);
    const newNet = Math.max(0, newTotalIncome - newExpense - currentDeductions);
    const newTax = calculateTaxFromNet(newNet);
    
    const additionalTax = newTax - currentTax;
    const netGain = additionalGrossIncome - additionalTax;
    const netGainPercentage = additionalGrossIncome > 0 ? (netGain / additionalGrossIncome * 100) : 0;
    
    return {
        newNet,
        newTax,
        additionalTax,
        netGain,
        netGainPercentage,
        shouldAccept: netGainPercentage > 50
    };
};
