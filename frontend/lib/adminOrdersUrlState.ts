export type AdminOrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type AdminPaymentMethod = 'cod' | 'bank_transfer' | 'simulated_card';

export type AdminOrdersUrlState = {
  query: string;
  orderStatus: AdminOrderStatus | '';
  paymentMethod: AdminPaymentMethod | '';
  page: number;
  pageSize: 10 | 20 | 50;
};

export const DEFAULT_ADMIN_ORDERS_STATE: AdminOrdersUrlState = {
  query: '',
  orderStatus: '',
  paymentMethod: '',
  page: 1,
  pageSize: 20,
};

export function parseAdminOrdersSearchParams(searchParams: URLSearchParams): AdminOrdersUrlState {
  const query = searchParams.get('query') || '';

  const rawStatus = searchParams.get('orderStatus');
  const orderStatus = (['pending', 'processing', 'completed', 'cancelled'].includes(rawStatus || '')
    ? rawStatus
    : '') as AdminOrderStatus | '';

  const rawMethod = searchParams.get('paymentMethod');
  const paymentMethod = (['cod', 'bank_transfer', 'simulated_card'].includes(rawMethod || '')
    ? rawMethod
    : '') as AdminPaymentMethod | '';

  const rawPage = searchParams.get('page');
  let page = 1;
  if (rawPage) {
    const parsedPage = parseInt(rawPage, 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  const rawPageSize = searchParams.get('pageSize');
  let pageSize: 10 | 20 | 50 = 20;
  if (rawPageSize) {
    const parsedSize = parseInt(rawPageSize, 10);
    if (parsedSize === 10 || parsedSize === 20 || parsedSize === 50) {
      pageSize = parsedSize;
    }
  }

  // Truncate excessively long query
  const safeQuery = query.length > 100 ? query.substring(0, 100) : query;

  return {
    query: safeQuery,
    orderStatus,
    paymentMethod,
    page,
    pageSize,
  };
}

export function serializeAdminOrdersSearchParams(state: AdminOrdersUrlState): string {
  const params = new URLSearchParams();

  if (state.query) {
    params.set('query', state.query);
  }
  if (state.orderStatus) {
    params.set('orderStatus', state.orderStatus);
  }
  if (state.paymentMethod) {
    params.set('paymentMethod', state.paymentMethod);
  }
  if (state.page > 1) {
    params.set('page', String(state.page));
  }
  if (state.pageSize !== 20) {
    params.set('pageSize', String(state.pageSize));
  }

  return params.toString();
}

export function isSameAdminOrdersUrlState(a: AdminOrdersUrlState, b: AdminOrdersUrlState): boolean {
  return (
    a.query === b.query &&
    a.orderStatus === b.orderStatus &&
    a.paymentMethod === b.paymentMethod &&
    a.page === b.page &&
    a.pageSize === b.pageSize
  );
}
