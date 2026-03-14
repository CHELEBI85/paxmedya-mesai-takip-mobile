import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GorevWidget } from './GorevWidget';

export const WIDGET_GOREV_KEY = 'widget_gorevler_hafta';

export async function widgetTaskHandler(props) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      try {
        const raw = await AsyncStorage.getItem(WIDGET_GOREV_KEY);
        const gorevler = raw ? JSON.parse(raw) : [];
        props.renderWidget(<GorevWidget gorevler={gorevler} />);
      } catch {
        props.renderWidget(<GorevWidget gorevler={[]} />);
      }
      break;
    }
    case 'WIDGET_DELETED':
      break;
    default:
      break;
  }
}
