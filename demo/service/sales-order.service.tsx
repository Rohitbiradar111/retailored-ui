import { GraphQLService } from './graphql.service';

export const SalesOrderService = {
  async getSalesOrders( page: number = 1, perPage: number = 4, search: string = ''): Promise<{ data: any[]; pagination: any }> {
    const query = `
      query OrderMains($first: Int!, $page: Int!, $search: String) {
        orderMains(first: $first, page: $page, search: $search) {
          paginatorInfo {
            count
            currentPage
            lastPage
            perPage
            total
            hasMorePages
          }
          data {
            id
            user_id
            docno
            order_date
            amt_paid
            amt_due
            cancelled_qty
            tentitive_delivery_date
            delivered_qty
            ord_amt
            desc1
            user {
              id
              fname
              admsite_code
            }
            orderStatus {
              id
              status_name
            }
          }
        }
      }
    `;
    
    const variables = {
      first: perPage,
      page: page,
      search: search || null
    };

    const data = await GraphQLService.query<{ 
      orderMains: {
        paginatorInfo: any;
        data: any[];
      } 
    }>(query, variables);

    return {
      data: data.orderMains.data,
      pagination: data.orderMains.paginatorInfo
    };
  },

  async getActiveCustomers(
    page: number = 1,
    perPage: number = 2,
    search: string | null = null
  ): Promise<{ data: any[]; pagination: any }> {
    const query = `
      query Users($first: Int!, $page: Int!, $search: String) {
        users(first: $first, page: $page, search: $search) {
          paginatorInfo {
            count
            currentPage
            hasMorePages
            lastPage
            perPage
            total
          }
          data {
            id
            fname
            lname
            email
            mobileNumber
            admsite_code
          }
        }
      }
    `;
    
    const variables = {
      first: perPage,
      page: page,
      search: search
    };

    const data = await GraphQLService.query<{ 
      users: {
        paginatorInfo: any;
        data: any[];
      } 
    }>(query, variables);

    return {
      data: data.users.data,
      pagination: data.users.paginatorInfo
    };
  },

  async getActiveMaterials(
    page: number = 1,
    perPage: number = 10,
    search: string | null = null
  ): Promise<{ data: any[]; pagination: any }> {
    const query = `
      query MaterialMasters($first: Int!, $page: Int, $search: String) {
        materialMasters(first: $first, page: $page, search: $search) {
          paginatorInfo {
            count
            currentPage
            hasMorePages
            lastPage
            perPage
            total
          }
          data {
            id
            name
            image_url
            wsp
            mrp
            priceChart {
              id
              material_id
              job_or_sales
              price
              ext
              type {
                id
                type_name
              }
            }
          }
        }
      }
    `;

    const variables = {
      first: perPage,
      page: page,
      search: search
    };

    const data = await GraphQLService.query<{ 
      materialMasters: {
        paginatorInfo: any;
        data: any[];
      }
    }>(query, variables);

    return {
      data: data.materialMasters.data,
      pagination: data.materialMasters.paginatorInfo
    };
  },

  async getMeasurementData(user_id: string, material_master_id: string): Promise<any> {
    const query = `
      query GetMeasurementData($user_id: ID!, $material_master_id: ID!) {
        getMeasurementData(user_id: $user_id, material_master_id: $material_master_id) {
          masters {
            id
            measurement_name
            data_type
            seq
            measurementDetail {
              id
              measurement_main_id
              measurement_master_id
              measurement_val
            }
          }
        }
      }
    `;
  
    const variables = { 
      user_id, 
      material_master_id 
    };
    
    const data = await GraphQLService.query<{ 
      getMeasurementData: { 
        masters: any[] 
      } 
    }>(query, variables);
    
    return data.getMeasurementData.masters;
  },

  async getSalesOrderById(id: string): Promise<any> {
    const query = `
      query OrderMain($id: ID!) {
        orderMain(id: $id) {
          id
          user_id
          docno
          order_date
          ord_amt
          amt_paid
          amt_due
          ord_qty
          delivered_qty
          cancelled_qty
          tentitive_delivery_date
          delivery_date
          desc1
          ext
          user {
            id
            fname
            admsite_code
          }
          orderStatus {
            id
            status_name
          }
          orderDetails {
            id
            order_id
            measurement_main_id
            image_url
            material_master_id
            trial_date
            delivery_date
            item_amt
            ord_qty
            delivered_qty
            cancelled_qty
            desc1
            ext
            item_ref
            orderStatus {
              id
              status_name
            }
            material {
              id
              name
            }
            jobOrderDetails {
              adminSite {
                  sitename
              }
            }
          }
        }
      }
    `;
    const variables = { id };
    const data = await GraphQLService.query<{ orderMain: any }>(query, variables);
    return data.orderMain;
  },

  async getOrderInfoByOrderId(orderId: string, page: number = 1, perPage: number = 20): Promise<{ data: any[]; pagination: any }> {
    const query = `
      query GetOrderInfoByOrderId($order_id: ID!, $first: Int!, $page: Int!) {
        getOrderInfoByOrderId(order_id: $order_id, first: $first, page: $page) {
          paginatorInfo {
            total
            count
            perPage
            currentPage
            lastPage
            hasMorePages
          }
          data {
            id
            docno
            admsite_code
            payment_date
            payment_ref
            payment_amt
            payment_type
            paymentMode {
              id
              mode_name
            }
          }
        }
      }
    `;

    const variables = {
      order_id: orderId,
      first: perPage,
      page: page
    };

    const data = await GraphQLService.query<{ 
      getOrderInfoByOrderId: {
        paginatorInfo: any;
        data: any[];
      } 
    }>(query, variables);

    return {
      data: data.getOrderInfoByOrderId.data,
      pagination: data.getOrderInfoByOrderId.paginatorInfo
    };
  },

  async getOrderMeasurements(orderId: number): Promise<any> {
    const query = `
      query OrderDetail($id: ID!) {
        orderDetail(id: $id) {
          measurementMain {
            measurement_date
            measurementDetails {
              measurement_val
              measurement_main_id
              measurementMaster {
                id
                measurement_name
                data_type
              }
            }
          }
        }
      }
    `;

    const variables = {
      id: orderId
    };

    try {
      const response = await GraphQLService.query<any>(query, variables);
      const result = response || { orderDetail: null };
      return result;
    } catch (error) {
      console.error('Error fetching measurements:', error);
      return { orderDetail: null };
    }
  },

  async updateMeasurementsDetails(
    id: number,
    input: {
      measurement_main_id: number | null;
      measurement_master_id: number | null;
      measurement_val: string | null;
    }[]
  ): Promise<any> {
    const mutation = `
      mutation UpdateMeasurementsDetails($id: ID!, $input: [UpdateMeasurementDetailInput!]!) {
        updateMeasurementsDetails(id: $id, input: $input) {
          id
        }
      }
    `;

    const variables = { id, input };
    const data = await GraphQLService.query<{ updateMeasurementsDetails: any }>(mutation, variables);
    return data.updateMeasurementsDetails;
  },

  async updateOrderDetails(
    id: string | number,
    input: {
      order_id: number | null;
      measurement_main_id: number | null;
      material_master_id: number | null;
      trial_date: string | null;
      delivery_date: string | null;
      item_amt: number | null;
      ord_qty: number | null;
      desc1: string | null;
      admsite_code: string | null;
    }
  ): Promise<any> {
    const mutation = `
      mutation UpdateOrderDetail($id: ID!, $input: UpdateOrderDetailInput!) {
        updateOrderDetail(id: $id, input: $input) {
          id
        }
      }
    `;

    const variables = { id, input };

    const data = await GraphQLService.query<{ updateOrderDetails: any }>(
      mutation,
      variables
    );

    return data.updateOrderDetails;
  },

  async updateSalesOrderStatus(
    id: number | string,
    input: {
      status_id: number | null;
    }
  ): Promise<any> {
    const mutation = `
      mutation UpdateSalesOrderStatus($id: ID!, $input: OrderStatusInput!) {
        updateSalesOrderStatus(id: $id, input: $input) {
          id
        }
      }
    `;

    const variables = { id, input };

    const data = await GraphQLService.query<{ updateSalesOrderStatus: any }>(
      mutation,
      variables
    );

    return data.updateSalesOrderStatus;
  },

  async markOrderDelivered(
    id: string,
    delivered_qty: number
  ): Promise<{ id: string }> {
      const mutation = `
        mutation MarkOrderDelivered($input: MarkOrderDeliveredInput!, $id: ID!) {
            markOrderDelivered(input: $input, id: $id) {
                id
            }
        }
    `;

    const variables = {
      id: id,
      input: {
          delivered_qty: delivered_qty
      }
    };

    const data = await GraphQLService.mutation<{ 
        markOrderDelivered: { id: string } 
    }>(mutation, variables);

    return data.markOrderDelivered;
  },

  async markOrderCancelled(
      id: string,
      cancelled_qty: number
  ): Promise<{ id: string }> {
      const mutation = `
          mutation MarkOrderCancelled($input: MarkOrderCancelledInput!, $id: ID!) {
              markOrderCancelled(input: $input, id: $id) {
                  id
              }
          }
      `;

      const variables = {
          id: id,
          input: {
              cancelled_qty: cancelled_qty
          }
      };

      const data = await GraphQLService.mutation<{ 
          markOrderCancelled: { id: string } 
      }>(mutation, variables);

      return data.markOrderCancelled;
  },

  async createOrderWithDetails(
    input: {
      user_id: number;
      order_date: string;
      order_details: Array<{
        material_master_id: number;
        image_url: string[];
        item_amt: number;
        item_discount: number;
        ord_qty: number;
        trial_date: string;
        delivery_date: string;
        item_ref: string;
        admsite_code: number;
        status_id: number;
        type_id: number;
        desc1: string;
        desc2: string;
        measurement_main: Array<{
          user_id: number;
          material_master_id: number;
          measurement_date: string;
          details: Array<{
            measurement_master_id: number;
            measurement_val: string;
          }>;
        }>;
      }>;
    }
  ): Promise<{ id: number }> {
    const mutation = `
      mutation CreateOrderWithDetails($input: CreateOrderWithDetailsInput!) {
        createOrderWithDetails(input: $input) {
          id
        }
      }
    `;
  
    const variables = { input };
    
    try {
      const data = await GraphQLService.query<{ 
        createOrderWithDetails: { id: number } 
      }>(mutation, variables);
      
      return data.createOrderWithDetails;
    } catch (error) {
      console.error('Error creating order with details:', error);
      throw new Error('Failed to create order with details');
    }
  },
};