import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

const ONESIGNAL_APP_ID = "f82bd795-4f0e-4adc-93d9-e8067943a8e8";
const ONESIGNAL_REST_API_KEY = "tfe7wupbmebvcgztrobnhz7s";

export const sendOrderNotification = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    
    const order = snap.data();

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: ["admin_nokz"],     
      contents: {
        en: `New Order #${order.orderNumber || context.params.orderId}`,
        id: `Ada order baru dari ${order.nama || order.name || order.customerName || "Customer"}`
      },
      headings: {
        en: "🛒 Order Baru Masuk!",
        id: "🛒 Order Baru Masuk!"
      },
      data: {
        orderId: context.params.orderId,
        screen: "admin"
      }
    };

    try {
      await axios.post("https://onesignal.com/api/v1/notifications", payload, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
        }
      });
      
      console.log(`✅ Notifikasi terkirim untuk order: ${context.params.orderId}`);
    } catch (error: any) {
      console.error("❌ Gagal kirim OneSignal:", error.response?.data || error.message);
    }
  });