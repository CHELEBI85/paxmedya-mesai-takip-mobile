const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 1) AndroidManifest'e widget receiver ekle
const withWidgetManifest = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];

    // Daha önce eklenmişse tekrar ekleme
    const receivers = app.receiver || [];
    const zatenVar = receivers.some(
      (r) => r.$?.['android:name'] === 'com.reactnativeandroidwidget.RNWidgetProvider'
    );
    if (zatenVar) return cfg;

    app.receiver = [
      ...receivers,
      {
        $: {
          'android:name': 'com.reactnativeandroidwidget.RNWidgetProvider',
          'android:exported': 'true',
        },
        'intent-filter': [
          { action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/gorev_widget_info',
            },
          },
        ],
      },
    ];

    app.service = [
      ...(app.service || []),
      {
        $: {
          'android:name': 'com.reactnativeandroidwidget.RNWidgetBackgroundService',
          'android:permission': 'android.permission.BIND_JOB_SERVICE',
          'android:exported': 'true',
        },
      },
    ];

    return cfg;
  });
};

// 2) res/xml ve res/layout dosyalarını kopyala
const withWidgetResources = (config) => {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const resDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');

      // xml klasörü
      const xmlDir = path.join(resDir, 'xml');
      if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'gorev_widget_info.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="294dp"
    android:minHeight="146dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/gorev_widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />`
      );

      // layout klasörü
      const layoutDir = path.join(resDir, 'layout');
      if (!fs.existsSync(layoutDir)) fs.mkdirSync(layoutDir, { recursive: true });
      fs.writeFileSync(
        path.join(layoutDir, 'gorev_widget_layout.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#141414"
    android:gravity="center"
    android:padding="12dp">
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Görevler yükleniyor..."
        android:textColor="#888888"
        android:textSize="13sp" />
</LinearLayout>`
      );

      return cfg;
    },
  ]);
};

module.exports = (config) => {
  config = withWidgetManifest(config);
  config = withWidgetResources(config);
  return config;
};
