import { UserRole } from './types';

export const navItems = [
  {
    label: 'Indicadores',
    path: 'dashboard',
    icon: 'dashboard',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Vendas',
    path: 'sales',
    icon: 'sales',
    roles: [UserRole.OWNER, UserRole.MANAGER, UserRole.TECHNICIAN],
  },
  {
    label: 'Histórico de Vendas',
    path: 'sales-history',
    icon: 'sales-history',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Caixa',
    path: 'cash',
    icon: 'cash',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Compras',
    path: 'purchases',
    icon: 'purchases',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Custos',
    path: 'costs',
    icon: 'costs',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Ordem de Serviço',
    path: 'service-orders',
    icon: 'service-orders',
    roles: [UserRole.OWNER, UserRole.MANAGER, UserRole.TECHNICIAN],
  },
  {
    label: 'Produtos',
    path: 'products',
    icon: 'products',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Serviços',
    path: 'services',
    icon: 'services',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Clientes',
    path: 'customers',
    icon: 'customers',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    label: 'Fornecedores',
    path: 'suppliers',
    icon: 'suppliers',
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  { label: 'Usuários', path: 'users', icon: 'users', roles: [UserRole.OWNER] },
];
