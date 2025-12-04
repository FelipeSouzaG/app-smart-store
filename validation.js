const lowercasePrefixes = ['e', 'da', 'de', 'di', 'do', 'dos', 'du', 'das'];

export function formatName(name) {
  if (!name || typeof name !== 'string') return '';

  const specialCases = {
    ii: 'II',
    iii: 'III',
    iv: 'IV',
    v: 'V',
    x: 'X',
    mc: 'Mc',
    mac: 'Mac',
    "o'": "O'",
  };

  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      const lowerWord = word.toLowerCase();

      if (specialCases[lowerWord]) {
        return specialCases[lowerWord];
      }

      if (lowercasePrefixes.includes(lowerWord) && index !== 0) {
        return lowerWord;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .filter((word) => word !== '')
    .join(' ');
}

export function validateName(name) {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  if (trimmed.length > 100) return false;
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmed)) return false; // Allow apostrophe and hyphen
  if (/\s{2,}/.test(trimmed)) return false;
  // Removed the requirement for a space, allowing single names.
  return true;
}

export function formatRegister(value) {
  if (!value) return '';
  const cleanValue = value.replace(/\D/g, '');

  if (cleanValue.length <= 11) {
    return cleanValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return cleanValue
      .substring(0, 14) // Limit to 14 digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

export function validateRegister(value) {
  const cleanValue = value.replace(/\D/g, '');

  if (cleanValue.length === 0) return true; // Campo opcional

  if (cleanValue.length === 11) {
    return validateCPF(cleanValue);
  } else if (cleanValue.length === 14) {
    return validateCNPJ(cleanValue);
  }
  return false;
}

export function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

export function validateCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  let digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePhone(phone) {
  if (!phone) return true;

  const cleanedPhone = phone.replace(/\D/g, '');

  if (!/^\d+$/.test(cleanedPhone)) return false;

  if (cleanedPhone.length < 10 || cleanedPhone.length > 11) return false;

  const ddd = cleanedPhone.substring(0, 2);
  if (ddd < '11' || ddd > '99') return false;

  if (/^(\d)\1{9,10}$/.test(cleanedPhone)) return false;

  return true;
}

export function formatPhone(phone) {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '').substring(0, 11);

  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
}

export function formatCurrencyNumber(value) {
  if (value === undefined || value === null || value === '') return '0,00';

  const numberValue =
    typeof value === 'string'
      ? parseFloat(value.replace(',', '.'))
      : Number(value);

  if (isNaN(numberValue)) return '0,00';

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function formatMoney(value) {
  let priceValue = value.replace(/[^0-9]/g, '');
  if (!priceValue) priceValue = '0';
  priceValue = (parseInt(priceValue) / 100).toFixed(2);
  let valueMoney = `R$ ${priceValue.replace('.', ',')}`;
  return valueMoney;
}

// Password Validation Utils
export function checkPasswordStrength(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[\W_]/.test(password), // Non-word characters (symbols)
  };
}

export function validatePassword(password) {
  const strength = checkPasswordStrength(password);
  return (
    strength.length &&
    strength.uppercase &&
    strength.lowercase &&
    strength.number &&
    strength.symbol
  );
}
