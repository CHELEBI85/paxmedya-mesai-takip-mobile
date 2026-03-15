import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORK_REMINDER_IDS_KEY = '@work_reminder_ids';
const MOTIVATION_IDS_KEY = '@motivation_notif_ids';

const MOTIVATION_MESSAGES = [
  "Bugün harika işler başarabilirsiniz! 💪",
  "Küçük bir adım bile ilerlemedir. Devam edin.",
  "Odaklanın, enerjiniz yeter.",
  "Her gün yeni bir fırsattır.",
  "Yaptığınız iş değerli.",
  "Kendinize güvenin ve ilerleyin.",
  "Disiplin başarının anahtarıdır.",
  "Bugün dünden daha iyisiniz.",
  "Sabırlı olun, sonuçlar geliyor.",
  "Küçük ilerlemeler büyük sonuçlar doğurur.",
  "Hedeflerinize bir adım daha yaklaştınız.",
  "İstikrarlı olmak en büyük güçtür.",
  "Bugün üretmek için güzel bir gün.",
  "Odak = başarı.",
  "Elinizden gelenin en iyisini yapın.",
  "Başlamak işin yarısıdır.",
  "Devam etmek fark yaratır.",
  "Enerjinizi doğru yere harcayın.",
  "Başarı sabır ister.",
  "Her deneme sizi geliştirir.",
  "Pes etmeyin, yolun yarısındasınız.",
  "Bugün üretken olabilirsiniz.",
  "Düşündüğünüzden daha güçlüsünüz.",
  "Zorluklar gelişimin parçasıdır.",
  "Bir adım daha atın.",
  "Motivasyon geçer, disiplin kalır.",
  "Bugün küçük bir ilerleme yapın.",
  "Yapabilirsiniz.",
  "Kendinizi küçümsemeyin.",
  "Bugün fark yaratabilirsiniz.",
  "İyi işler zaman alır.",
  "Her gün biraz daha iyi.",
  "Odaklan ve ilerle.",
  "Yapmaya devam et.",
  "Bugün yeni bir başlangıç.",
  "Kendinizi geliştirmeye devam edin.",
  "Başarı emek ister.",
  "İstikrar her şeydir.",
  "Yavaş ilerlemek de ilerlemektir.",
  "Bugün üretmeye devam edin.",
  "Kendinize inanın.",
  "Başarının yolu çalışmaktan geçer.",
  "Bugün iyi bir gün olabilir.",
  "Bir adım daha ilerleyin.",
  "Gelişim sabır ister.",
  "Çabalarınız boşa gitmiyor.",
  "Bugün kendiniz için çalışın.",
  "İlerlemeniz önemli.",
  "Devam edin, doğru yoldasınız.",
  "Bugün üretken olun.",
  "Zamanınızı iyi değerlendirin.",
  "Başarı detaylarda gizlidir.",
  "Çalışkanlık fark yaratır.",
  "Bugün fırsatlarla dolu.",
  "Kendinizi zorlamaktan korkmayın.",
  "Biraz daha devam edin.",
  "Her gün yeni bir şans.",
  "Bugün bir şey üretin.",
  "Az ama sürekli ilerleyin.",
  "İnandığınız şey için çalışın.",
  "Başarının temeli sabırdır.",
  "Bugün iyi bir başlangıç yapın.",
  "Kendinizi geliştirmeye devam.",
  "İlerleme kaydediyorsunuz.",
  "Çalışmanız değerli.",
  "Bugün bir adım daha.",
  "Disiplin kazandırır.",
  "Hedeflerinizi unutmayın.",
  "Odaklanmaya devam edin.",
  "Bugün üretken kalın.",
  "Sakin olun ve ilerleyin.",
  "Her şey adım adım olur.",
  "Yaptığınız şey önemli.",
  "Başarı sabırlı olanındır.",
  "Devam etmek kazanmak demektir.",
  "Bugün kendinizi geliştirin.",
  "İlerleme küçük başlar.",
  "Kendinizi zorlayın.",
  "Başarmak için devam edin.",
  "Bugün iyi işler çıkarın.",
  "Azim kazanır.",
  "İlerleme kaydediyorsunuz.",
  "Bugün üretmeye odaklanın.",
  "Her gün bir fırsat.",
  "Çalışmaya devam edin.",
  "Sabırla ilerleyin.",
  "Bugün fark yaratabilirsiniz.",
  "İstikrarlı olun.",
  "Kendinizi geliştirin.",
  "Bugün üretken olun.",
  "Başarı çalışkanlıktır.",
  "Biraz daha devam.",
  "Yolun sonuna yaklaşıyorsunuz.",
  "Bugün ilerleme günü.",
  "Disiplin sizi ileri taşır.",
  "Her gün daha iyi.",
  "Odaklanın ve ilerleyin.",
  "Bugün en iyinizi yapın."
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const notificationService = {
  async requestPermissions() {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return false;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Varsayılan',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#000000',
        });
        await Notifications.setNotificationChannelAsync('equipment', {
          name: 'Ekipman Hatırlatmaları',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#000000',
        });
        await Notifications.setNotificationChannelAsync('motivation', {
          name: 'Günlük Hatırlatma',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150],
          lightColor: '#000000',
        });
        await Notifications.setNotificationChannelAsync('gorevler', {
          name: 'Görev Bildirimleri',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#000000',
        });
      }

      return true;
    } catch (e) {
      if (__DEV__) console.warn('Notification permission error:', e);
      return false;
    }
  },

  async scheduleEquipmentReminder(itemName, hours = 24) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Ekipman Hatırlatması',
          body: `"${itemName}" adlı ekipman ${hours} saattir üzerinizde. Teslim etmeyi unutmayın!`,
          data: { type: 'equipment_reminder', itemName },
          ...(Platform.OS === 'android' && { channelId: 'equipment', color: '#000000' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: hours * 3600,
        },
      });
      return id;
    } catch (e) {
      if (__DEV__) console.warn('Schedule notification error:', e);
      return null;
    }
  },

  async scheduleWorkReminders() {
    const reminders = [
      { hour: 9, minute: 15, title: 'Mesai Girişi', body: 'Mesai giriş saati yaklaşıyor. Giriş yapmayı unutmayın!' },
      { hour: 9, minute: 45, title: 'Mesai Girişi', body: 'Henüz giriş yapmadıysanız, lütfen giriş yapın!' },
      { hour: 18, minute: 15, title: 'Mesai Çıkışı', body: 'Çıkış saati yaklaşıyor. Çıkış yapmayı unutmayın!' },
      { hour: 18, minute: 45, title: 'Mesai Çıkışı', body: 'Henüz çıkış yapmadıysanız, lütfen çıkış yapın!' },
    ];

    const ids = [];
    const now = new Date();

    for (const r of reminders) {
      try {
        const target = new Date(now);
        target.setHours(r.hour, r.minute, 0, 0);

        if (target <= now) continue;

        const seconds = Math.floor((target - now) / 1000);
        if (seconds <= 0) continue;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: r.title,
            body: r.body,
            data: { type: 'work_reminder' },
            ...(Platform.OS === 'android' && { color: '#000000' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
          },
        });
        if (id) ids.push(id);
      } catch (e) {
        if (__DEV__) console.warn('Schedule work reminder error:', e);
      }
    }

    try {
      if (ids.length) await AsyncStorage.setItem(WORK_REMINDER_IDS_KEY, JSON.stringify(ids));
    } catch (e) {
      if (__DEV__) console.warn('Store work reminder ids:', e);
    }
    return ids;
  },

  async cancelWorkReminders() {
    try {
      const raw = await AsyncStorage.getItem(WORK_REMINDER_IDS_KEY);
      if (raw) {
        const ids = JSON.parse(raw);
        for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id);
        await AsyncStorage.removeItem(WORK_REMINDER_IDS_KEY);
      }
    } catch (e) {
      if (__DEV__) console.warn('Cancel work reminders error:', e);
    }
  },

  async scheduleWeekdayMotivation() {
    try {
      const now = new Date();
      const day = now.getDay();
      if (day === 0 || day === 6) return [];

      const hour = now.getHours();
      const ids = [];
      const stored = await AsyncStorage.getItem(MOTIVATION_IDS_KEY);
      if (stored) {
        for (const id of JSON.parse(stored)) await Notifications.cancelScheduledNotificationAsync(id);
        await AsyncStorage.removeItem(MOTIVATION_IDS_KEY);
      }

      const baslangicSaat = Math.max(hour + 1, 9);
      for (let h = baslangicSaat; h <= 18; h++) {
        const at = new Date(now);
        at.setHours(h, 0, 0, 0);
        const seconds = Math.floor((at - now) / 1000);
        if (seconds <= 0) continue;
        const msg = MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)];
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            body: msg,
            data: { type: 'motivation' },
            ...(Platform.OS === 'android' && { channelId: 'motivation', color: '#000000' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
          },
        });
        if (id) ids.push(id);
      }
      if (ids.length) await AsyncStorage.setItem(MOTIVATION_IDS_KEY, JSON.stringify(ids));
      return ids;
    } catch (e) {
      if (__DEV__) console.warn('Schedule weekday motivation error:', e);
      return [];
    }
  },

  async notifyYeniGorev(gorevAdi) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Yeni görev atandı',
          body: gorevAdi ? `"${gorevAdi}" görevi size atandı.` : 'Bu haftaki görev listeniz güncellendi.',
          data: { type: 'new_task' },
          ...(Platform.OS === 'android' && { channelId: 'gorevler' }),
        },
        trigger: null,
      });
    } catch (e) {
      if (__DEV__) console.warn('notifyYeniGorev error:', e);
    }
  },

  async cancelNotification(id) {
    try {
      if (id) await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      if (__DEV__) console.warn('Cancel notification error:', e);
    }
  },

  async cancelAll() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      if (__DEV__) console.warn('Cancel all notifications error:', e);
    }
  },

  addNotificationListener(handler) {
    return Notifications.addNotificationReceivedListener(handler);
  },

  addResponseListener(handler) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  },
};

export default notificationService;
