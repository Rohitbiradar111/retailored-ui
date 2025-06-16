'use client';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { useRouter } from 'next/navigation';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { useSearchParams } from 'next/navigation';
import { SalesOrderService } from '@/demo/service/sales-order.service';
import { JobOrderService } from '@/demo/service/job-order.service';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useDebounce } from 'use-debounce';
import { Toast } from '@capacitor/toast';

interface Order {
    id: string;
    user_id: string;
    docno: string;
    order_date: string;
    customer: string;
    ord_amt: number;
    amt_paid: number;
    amt_due: number;
    ord_qty: number;
    delivered_qty: number;
    cancelled_qty: number;
    tentitive_delivery_date: string;
    delivery_date: string;
    desc1: string | null;
    ext: string;
    user: {
        id: string;
        fname: string;
        admsite_code: number;
    };
    orderStatus: {
        id: string;
        status_name: string;
    } | null;
    orderDetails: {
        id: string;
        order_id: string;
        measurement_main_id: string;
        image_url: string[] | null;
        material_master_id: string;
        trial_date: string | null;
        delivery_date: string | null;
        item_amt: number;
        ord_qty: number;
        delivered_qty: number;
        cancelled_qty: number;
        desc1: string | null;
        ext: string;
        item_ref: string;
        orderStatus: {
            id: string;
            status_name: string;
        } | null;
        material: {
            id: string;
            name: string;
        };
        jobOrderDetails: {
            adminSite?: {
                sitename: string;
            };
        }[];
    }[];
}

const SalesOrderDetails = () => {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 1000);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [visible, setVisible] = useState(false);
    const [paymentDialogVisible, setPaymentDialogVisible] = useState(false);
    const [paymentModes, setPaymentModes] = useState<{ id: string; mode_name: string }[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        perPage: 20,
        total: 0,
        hasMorePages: true
    });
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        reference: ''
    });
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const source = searchParams.get('source');
    const observer = useRef<IntersectionObserver | null>(null);
    const lastOrderRef = useRef<HTMLDivElement>(null);

    const fetchOrders = useCallback(
        async (page: number, perPage: number, loadMore = false) => {
            try {
                if (loadMore) {
                    setIsFetchingMore(true);
                } else {
                    setLoading(true);
                }

                const response = await SalesOrderService.getSalesOrders(page, perPage, debouncedSearchTerm);
                const newOrders = response.data.map((res: any) => ({
                    ...res,
                    customer: res.user.fname,
                    delivery_date: res.tentitive_delivery_date,
                    orderDetails: []
                }));

                if (loadMore) {
                    setOrders((prev) => [...prev, ...newOrders]);
                } else {
                    setOrders(newOrders);
                }

                setPagination({
                    currentPage: response.pagination.currentPage,
                    perPage: response.pagination.perPage,
                    total: response.pagination.total,
                    hasMorePages: response.pagination.hasMorePages
                });
            } catch (error) {
                console.error('Error fetching sales orders:', error);
                setError('Failed to fetch orders');
                await Toast.show({
                    text: 'Failed to load orders',
                    duration: 'short',
                    position: 'bottom'
                });
            } finally {
                if (loadMore) {
                    setIsFetchingMore(false);
                } else {
                    setLoading(false);
                }
            }
        },
        [debouncedSearchTerm]
    );

    useEffect(() => {
        if (!source) {
            fetchOrders(1, pagination.perPage);
        }
    }, [fetchOrders, pagination.perPage, debouncedSearchTerm]);

    useEffect(() => {
        if (id) {
            const openDialog = async () => {
                try {
                    await fetchOrderDetails(id);
                } finally {
                    setLoading(false);
                    setVisible(true);
                }
            };

            openDialog();
        }
    }, [id]);

    useEffect(() => {
        if (!pagination.hasMorePages || loading || isFetchingMore) return;

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            if (entries[0].isIntersecting) {
                fetchOrders(pagination.currentPage + 1, pagination.perPage, true);
            }
        };

        if (lastOrderRef.current) {
            observer.current = new IntersectionObserver(observerCallback, {
                root: null,
                rootMargin: '20px',
                threshold: 1.0
            });

            observer.current.observe(lastOrderRef.current);
        }

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [pagination, loading, isFetchingMore, fetchOrders]);

    const fetchOrderDetails = async (orderId: string) => {
        try {
            setListLoading(true);
            const res = await SalesOrderService.getSalesOrderById(orderId);

            if (res && res.orderDetails) {
                const detailedOrder: Order = res;
                setSelectedOrder(detailedOrder);
            } else {
                setSelectedOrder(null);
                throw new Error('Order details are missing from the response');
            }
        } catch (err) {
            console.error('Failed to fetch order details:', err);
            setError('Failed to fetch order details');
            setSelectedOrder(null);
        } finally {
            setListLoading(false);
        }
    };

    const fetchPaymentModes = useCallback(async () => {
        try {
            const modes = await JobOrderService.getPaymentModes();
            setPaymentModes(modes);
        } catch (error) {
            console.error('Error fetching payment modes:', error);
        }
    }, []);

    const getStatusSeverity = (status?: string): 'success' | 'info' | 'warning' | 'danger' | null | undefined => {
        switch (status) {
            case 'Completed':
                return 'success';
            case 'In Progress':
                return 'info';
            case 'Pending':
                return 'warning';
            case 'Cancelled':
                return 'danger';
            case 'Partial':
                return 'warning';
            case 'Unknown':
                return 'info';
            default:
                return null;
        }
    };

    const formatDate = (date: Date | null) => {
        return date ? date.toLocaleDateString('en-IN') : 'Not scheduled';
    };

    const handlePaymentClick = () => {
        if (selectedOrder) {
            setPaymentForm({
                amount: selectedOrder.amt_due.toString(),
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: '',
                reference: ''
            });
            setPaymentDialogVisible(true);
            fetchPaymentModes();
        }
    };

    return (
        <div>
            <div className="px-3">
                <div className="flex gap-3 align-center">
                    <span className="pi pi-arrow-left" onClick={() => router.push(`/pages/reports/pending-sales`)}></span>
                    <span className="font-semibold" style={{ marginBottom: '40px' }}>
                        Order Details
                    </span>
                </div>
                {listLoading ? (
                    <div className="p-fluid mt-3">
                        <div className="mb-4">
                            <Skeleton width="100%" height="10rem" borderRadius="6px" className="mb-5" />
                            <Skeleton width="100%" height="2.5rem" borderRadius="6px" className="mb-5" />
                            <Skeleton width="100%" height="20rem" className="mb-1" />
                        </div>

                        <div className="grid">
                            <div className="col-12 md:col-4 mb-2">
                                <Skeleton width="100%" height="2.5rem" borderRadius="6px" />
                            </div>
                            <div className="col-12 md:col-4 mb-2">
                                <Skeleton width="100%" height="2.5rem" borderRadius="6px" />
                            </div>
                            <div className="col-12 md:col-4 mb-2">
                                <Skeleton width="100%" height="2.5rem" borderRadius="6px" />
                            </div>
                        </div>
                    </div>
                ) : selectedOrder ? (
                    <div>
                        <div>
                            <div className="flex justify-content-between">
                                <p>Name:</p>
                                <p>{selectedOrder?.user?.fname}</p>
                            </div>
                            <div className="flex justify-content-between">
                                <p>Order Date:</p>
                                <p>{formatDate(new Date(selectedOrder.order_date))}</p>
                            </div>
                            <div className="flex justify-content-between">
                                <p>Status:</p>
                                <Tag value={selectedOrder.orderStatus?.status_name || 'Unknown'} severity={getStatusSeverity(selectedOrder.orderStatus?.status_name) || undefined} className="px-2 mb-3" />
                            </div>
                            <div className="flex justify-content-between">
                                <p>Trial Date:</p>
                                <p>{selectedOrder.orderDetails?.some((item) => item.trial_date) ? formatDate(new Date(selectedOrder.orderDetails.find((item) => item.trial_date)?.trial_date || '')) : 'Not scheduled'}</p>
                            </div>
                        </div>

                        <Divider />

                        <p className="font-bold mb-1">Order Details</p>
                        <div className="flex justify-content-between align-items-center border-1 border-gray-500 p-3" style={{ borderRadius: '10px' }}>
                            <div className="flex align-items-center gap-3">
                                {selectedOrder.orderDetails.map((item) => (
                                    <span key={item.id} className="m-0 white-space-nowrap">
                                        {item.material?.name || 'Not Available'}
                                    </span>
                                ))}
                            </div>
                            <Button
                                label="View Details"
                                onClick={() => router.push(`/pages/orders/order-items?id=${selectedOrder.id}`)}
                                className="text-blue-600 underline focus:outline-none border-none px-0 py-0"
                                style={{ boxShadow: 'none', fontSize: '14px' }}
                                text
                            />
                        </div>

                        <div className="border bg-gray-200 my-4" style={{ borderRadius: '10px' }}>
                            <div className="p-2">
                                {selectedOrder.orderDetails.map((item) => (
                                    <div key={item.id} className="flex justify-content-between mb-0">
                                        <p>{item.material?.name || 'Not Available'}:</p>
                                        <p>132.0</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-content-between px-2">
                                <p>Stitching Cost:</p>
                                <p>1 * 132.0 + 1 * 132.0 = 264</p>
                            </div>
                            <div className="flex justify-content-between px-2 mb-0">
                                <p>Total Cost:</p>
                                <p>264</p>
                            </div>
                        </div>

                        <div className="border bg-gray-200 my-3" style={{ borderRadius: '10px' }}>
                            <div className="p-2">
                                <div className="flex justify-content-between px-2">
                                    <p>Advance Amount:</p>
                                    <p className="">0.0</p>
                                </div>
                                <div className="flex justify-content-between px-2">
                                    <p>Balance Due:</p>
                                    <p>264</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex gap-2">
                                <p className="pi pi-list"></p>
                                <p className="font-bold">Transactions:</p>
                            </div>
                            {loadingPaymentHistory ? (
                                <div className="flex justify-content-center p-4">
                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="4" />
                                </div>
                            ) : paymentHistory.length > 0 ? (
                                <div className="flex flex-column gap-2 p-2">
                                    {paymentHistory.map((payment, index) => (
                                        <div key={index} className="flex justify-content-between align-items-center border-1 surface-border p-3 border-round">
                                            <div className="text-sm">
                                                <div className="text-500">Date</div>
                                                <div className="font-medium">{new Date(payment.payment_date).toLocaleDateString('en-IN')}</div>
                                            </div>
                                            <div className="text-sm text-right">
                                                <div className="text-500">Amount</div>
                                                <div className="font-medium">₹{payment.payment_amt}</div>
                                            </div>
                                            <div className="text-sm text-right">
                                                <div className="text-500">Method</div>
                                                <div className="font-medium">{payment.paymentMode?.mode_name || payment.payment_type || 'Unknown'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-column align-items-center justify-content-center p-5">
                                    <i className="pi pi-info-circle text-2xl mb-2"></i>
                                    <p className="text-500 m-0">No payment history found</p>
                                </div>
                            )}
                        </div>

                        <div className="flex" style={{ marginTop: '100px' }}>
                            <Button label="Receive Payment" onClick={handlePaymentClick} disabled={selectedOrder?.amt_due === 0 || selectedOrder?.amt_due === undefined} className="w-full" />
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-content-center align-items-center" style={{ height: '200px' }}>
                        <p>No order details available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesOrderDetails;
