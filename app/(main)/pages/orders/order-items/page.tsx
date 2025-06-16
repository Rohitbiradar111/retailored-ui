'use client';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Skeleton } from 'primereact/skeleton';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { useSearchParams } from 'next/navigation';
import { SalesOrderService } from '@/demo/service/sales-order.service';
import { useState, useEffect, useRef, useCallback } from 'react';
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

const SalesOrderItems = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 1000);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isMaximized, setIsMaximized] = useState(true);
    const [visible, setVisible] = useState(false);
    const [editOrderDetailDialogVisible, setEditOrderDetailDialogVisible] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order['orderDetails'][0] | null>(null);
    const [statusSidebarVisible, setStatusSidebarVisible] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<Order['orderDetails'][0] | null>(null);
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        perPage: 20,
        total: 0,
        hasMorePages: true
    });
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const source = searchParams.get('source');
    const observer = useRef<IntersectionObserver | null>(null);
    const lastOrderRef = useRef<HTMLDivElement>(null);

    const availableStatuses = [
        { id: '1', name: 'Pending' },
        { id: '2', name: 'In Progress' },
        { id: '5', name: 'Ready for Trial' },
        { id: '3', name: 'Completed' },
        { id: '4', name: 'Cancelled' }
    ];

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

    const formatDate = (date: Date | null) => {
        return date ? date.toLocaleDateString('en-IN') : 'Not scheduled';
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const handleEditOrderDetail = (detail: Order['orderDetails'][0]) => {
        setSelectedOrderDetail(detail);
        setEditOrderDetailDialogVisible(true);
    };

    const handleUpdateOrderDetail = async () => {
        if (!selectedOrderDetail || !selectedOrder || !selectedOrderDetail.id) {
            await Toast.show({
                text: 'Invalid order details for update',
                duration: 'short',
                position: 'bottom'
            });
            return;
        }

        try {
            setIsSavingDetails(true);

            await SalesOrderService.updateOrderDetails(selectedOrderDetail.id, {
                order_id: Number(selectedOrderDetail.order_id),
                measurement_main_id: Number(selectedOrderDetail.measurement_main_id),
                material_master_id: Number(selectedOrderDetail.material_master_id),
                trial_date: formatDateTime(selectedOrderDetail.trial_date),
                delivery_date: formatDateTime(selectedOrderDetail.delivery_date),
                item_amt: selectedOrderDetail.item_amt,
                ord_qty: selectedOrderDetail.ord_qty,
                desc1: selectedOrderDetail.desc1,
                admsite_code: selectedOrder?.user?.admsite_code.toString() || null
            });

            await Toast.show({
                text: 'Order details updated successfully',
                duration: 'short',
                position: 'bottom'
            });

            await fetchOrderDetails(selectedOrder.id);
            await fetchOrders(pagination.currentPage, pagination.perPage);
            setEditOrderDetailDialogVisible(false);
        } catch (err: any) {
            const errorMessage = err?.message || 'Failed to update order details';
            await Toast.show({
                text: errorMessage,
                duration: 'short',
                position: 'bottom'
            });
            console.error('Error:', err);
        } finally {
            setIsSavingDetails(false);
        }
    };

    const handleItemStatusUpdate = async (statusId: number) => {
        if (!selectedDetail || !selectedOrder) return;

        try {
            setLoading(true);
            await SalesOrderService.updateSalesOrderStatus(selectedDetail.id, {
                status_id: statusId
            });

            const newStatus = availableStatuses.find((s) => parseInt(s.id) === statusId)?.name;

            await Toast.show({
                text: `Item status updated to ${newStatus || 'selected status'}`,
                duration: 'short',
                position: 'bottom'
            });

            await Promise.all([fetchOrderDetails(selectedOrder.id), fetchOrders(pagination.currentPage, pagination.perPage)]);
        } catch (err: any) {
            const errorMessage = err?.message || 'Failed to update item status';
            await Toast.show({
                text: errorMessage,
                duration: 'short',
                position: 'bottom'
            });
            console.error('Error:', err);
        } finally {
            setLoading(false);
            setStatusSidebarVisible(false);
        }
    };

    return (
        <div>
            <Button
                label="Back"
                icon="pi pi-arrow-left"
                className="text-blue-600 focus:outline-none border-none"
                style={{ boxShadow: 'none' }}
                onClick={() => {
                    if (selectedOrder?.id) {
                        window.location.href = `/pages/orders/order-details?id=${selectedOrder.id}`;
                    } else {
                        window.history.back();
                    }
                }}
                text
            />

            {isFetchingMore && (
                <div className="flex justify-content-center mt-3">
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-spinner pi-spin" />
                        <span>Loading more orders...</span>
                    </div>
                </div>
            )}

            {listLoading ? (
                <div className="mt-3">
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
                    {selectedOrder.orderDetails.length > 0 ? (
                        selectedOrder.orderDetails.map((item) => (
                            <div key={item.id} className="p-4">
                                <div>
                                    <div className="flex justify-content-between">
                                        <p>Name:</p>
                                        <p>{item.item_ref || 'Not Available'}</p>
                                    </div>
                                    <div className="flex justify-content-between">
                                        <p>Job Order No:</p>
                                        <p className="m-0 font-medium">{item.order_id}</p>
                                    </div>
                                    <div className="flex justify-content-between">
                                        <p>Jobber Name:</p>
                                        <p className="m-0 font-medium">{item.jobOrderDetails?.[0]?.adminSite?.sitename || 'Not assigned'}</p>
                                    </div>
                                    <div className="flex justify-content-between">
                                        <p>Trial Date:</p>
                                        <p className="m-0 font-medium">{item.trial_date ? formatDate(new Date(item.trial_date)) : 'Not scheduled'}</p>
                                    </div>
                                    <div className="flex justify-content-between">
                                        <p>Amount:</p>
                                        <p className="m-0 font-medium">₹ {item.item_amt || 0}</p>
                                    </div>
                                    <div className="flex justify-content-between align-items-center">
                                        <p className="mt-2">Status:</p>
                                        <Dropdown
                                            value={item.orderStatus?.id || ''}
                                            options={availableStatuses}
                                            optionLabel="name"
                                            optionValue="id"
                                            placeholder="Select Status"
                                            onChange={(e) => {
                                                setSelectedDetail(item);
                                                handleItemStatusUpdate(Number(e.value));
                                            }}
                                            disabled={!item.orderStatus}
                                        />
                                    </div>
                                    <div className="flex justify-content-between mt-2 border-2 p-2">
                                        <div>
                                            <p className="font-bold">Item Name</p>
                                            <p>{item.material?.name || 'Not Available'}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold">Measurements</p>
                                            <p>Measurement Id: {item.measurement_main_id}</p>
                                            <p>Material Master Id: {item.material_master_id}</p>
                                            <p>Order Quantity: {item.ord_qty}</p>
                                            <Button label="Edit Details" onClick={() => handleEditOrderDetail(item)} className="m-0 p-0 underline" text />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div>
                            <p>No Items Found.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex justify-content-center align-items-center" style={{ height: '200px' }}>
                    <p>No order details available</p>
                </div>
            )}

            <Dialog
                header="Edit Order Details"
                visible={editOrderDetailDialogVisible}
                onHide={() => setEditOrderDetailDialogVisible(false)}
                maximized={isMaximized}
                onMaximize={(e) => setIsMaximized(e.maximized)}
                className={isMaximized ? 'maximized-dialog' : ''}
                blockScroll
                footer={
                    <div>
                        <Button label="Update" icon="pi pi-check" onClick={handleUpdateOrderDetail} autoFocus className="w-full" loading={isSavingDetails} disabled={isSavingDetails} />
                    </div>
                }
            >
                {selectedOrderDetail && (
                    <div className="p-fluid my-4">
                        <div className="field">
                            <label htmlFor="trialDate">Trial Date</label>
                            <Calendar
                                id="trialDate"
                                value={selectedOrderDetail?.trial_date ? new Date(selectedOrderDetail.trial_date) : null}
                                onChange={(e) => {
                                    if (!selectedOrderDetail) return;
                                    setSelectedOrderDetail({
                                        ...selectedOrderDetail,
                                        trial_date: e.value ? e.value.toISOString() : null
                                    });
                                }}
                                dateFormat="dd/mm/yy"
                                showTime
                                hourFormat="12"
                                showIcon
                                placeholder="Select Trial Date & Time"
                                minDate={new Date()}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="deliveryDate">Delivery Date</label>
                            <Calendar
                                id="deliveryDate"
                                value={selectedOrderDetail?.delivery_date ? new Date(selectedOrderDetail.delivery_date) : null}
                                onChange={(e) => {
                                    if (!selectedOrderDetail) return;
                                    setSelectedOrderDetail({
                                        ...selectedOrderDetail,
                                        delivery_date: e.value ? e.value.toISOString() : null
                                    });
                                }}
                                dateFormat="dd/mm/yy"
                                showTime
                                hourFormat="12"
                                showIcon
                                placeholder="Select Delivery Date & Time"
                                minDate={new Date()}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="itemAmt">Item Amount</label>
                            <InputNumber
                                id="itemAmt"
                                value={selectedOrderDetail.item_amt}
                                onValueChange={(e) =>
                                    setSelectedOrderDetail({
                                        ...selectedOrderDetail,
                                        item_amt: e.value || 0
                                    })
                                }
                                mode="currency"
                                currency="INR"
                                locale="en-IN"
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="ordQty">Order Qty</label>
                            <InputNumber
                                id="ordQty"
                                value={selectedOrderDetail.ord_qty}
                                onValueChange={(e) =>
                                    setSelectedOrderDetail({
                                        ...selectedOrderDetail,
                                        ord_qty: e.value || 0
                                    })
                                }
                                min={0}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="desc1">Special Instruction</label>
                            <InputTextarea
                                id="desc1"
                                value={selectedOrderDetail.desc1 || ''}
                                onChange={(e) =>
                                    setSelectedOrderDetail({
                                        ...selectedOrderDetail,
                                        desc1: e.target.value
                                    })
                                }
                                rows={4}
                                autoResize
                            />
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default SalesOrderItems;
