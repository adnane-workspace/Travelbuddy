import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export type ChatMessage = { role: 'assistant' | 'user'; text: string };
export const welcomeMessage: ChatMessage = {
  role: 'assistant',
  text: 'Bonjour ! Préparons votre découverte de Fès. Vous pouvez me parler du programme, d’une pause ou du trajet.',
};

function demoReply(message: string) {
  const query = message.toLocaleLowerCase();
  if (/manger|restaurant|café|cafe|pause/.test(query)) {
    return 'Pour une pause, ouvrez Carte puis Explorer en 3D. Avec l’aperçu Google configuré, les catégories Cafés et Restaurants permettent de trouver un lieu et de l’ajouter comme prochaine étape.';
  }
  if (/trajet|route|carte|guidage/.test(query)) {
    return 'Dans Carte, ouvrez Itinéraire et choisissez À pied ou En voiture. Une fois le trajet calculé, Démarrer le guidage affiche les indications dans TravelBuddy.';
  }
  if (/programme|visiter|fès|fes|journée/.test(query)) {
    return 'Le programme de démonstration passe par Bab Boujloud, la Médersa Al-Attarine et la Tannerie Chouara. L’onglet Organisation affiche les horaires proposés et votre progression.';
  }
  return 'Cette conversation utilise des réponses de démonstration. Essayez « Que visiter à Fès ? », « Faire une pause » ou « Comment lancer le guidage ? ».';
}

export function ChatScreen({ messages, onMessagesChange }: {
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const conversation = useRef<ComponentRef<typeof ScrollView>>(null);

  function send(value: string) {
    const text = value.trim();
    if (!text) return;
    onMessagesChange([...messages, { role: 'user', text }, { role: 'assistant', text: demoReply(text) }]);
    setDraft('');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Votre compagnon</Text>
        <Text style={styles.muted}>Chat de démonstration · Réponses prédéfinies</Text>
      </View>
      <ScrollView ref={conversation} style={styles.conversation} contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled" onContentSizeChange={() => conversation.current?.scrollToEnd({ animated: true })}>
        {messages.map((message, index) => (
          <View key={index} style={[styles.bubble, message.role === 'user' && styles.userBubble]}>
            <Text style={[styles.speaker, message.role === 'user' && styles.userText]}>
              {message.role === 'user' ? 'Vous' : 'TravelBuddy'}
            </Text>
            <Text selectable accessibilityLiveRegion={index === messages.length - 1 ? 'polite' : 'none'}
              style={[styles.message, message.role === 'user' && styles.userText]}>{message.text}</Text>
          </View>
        ))}
        {messages.length === 1 && (
          <View style={styles.suggestions}>
            {['Que visiter à Fès ?', 'Faire une pause', 'Comment lancer le guidage ?'].map((question) => (
              <Pressable key={question} accessibilityRole="button" style={styles.suggestion} onPress={() => send(question)}>
                <Text style={styles.speaker}>{question}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Votre message…"
          placeholderTextColor="#63736a" accessibilityLabel="Votre message au compagnon"
          style={styles.input} maxLength={2000} multiline />
        <Pressable accessibilityRole="button" accessibilityLabel="Envoyer le message"
          accessibilityState={{ disabled: !draft.trim() }} disabled={!draft.trim()}
          style={[styles.send, !draft.trim() && styles.disabled]} onPress={() => send(draft)}>
          <Text style={styles.userText}>Envoyer</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.settings}>
      <Text accessibilityRole="header" style={styles.title}>Réglages</Text>
      <Text style={styles.muted}>Aperçu de la configuration de cette démonstration.</Text>
      <View style={styles.settingsCard}>
        {[
          ['Langue', 'Français'],
          ['Unités de distance', 'Kilomètres et mètres'],
          ['Ville de démonstration', 'Fès, Maroc'],
          ['Conversation', 'Réponses prédéfinies'],
          ['Données de démonstration', 'Conservées pendant la session'],
        ].map(([label, value]) => (
          <View key={label} style={styles.setting}>
            <Text style={styles.speaker}>{label}</Text>
            <Text style={styles.muted}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.muted}>TravelBuddy · Voyage de démonstration</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { padding: 20, gap: 6 },
  title: { color: '#19372e', fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  muted: { color: '#53665e', fontSize: 14, lineHeight: 21 },
  conversation: { flex: 1 },
  messages: { paddingHorizontal: 16, paddingBottom: 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  bubble: { alignSelf: 'flex-start', maxWidth: '92%', padding: 16, borderRadius: 18, borderBottomLeftRadius: 5, backgroundColor: '#fff', gap: 5 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#285b4b', borderBottomLeftRadius: 18, borderBottomRightRadius: 5 },
  speaker: { color: '#285b4b', fontWeight: '700', fontSize: 14 },
  message: { color: '#19372e', fontSize: 16, lineHeight: 24 },
  userText: { color: '#fff9ee' },
  suggestions: { gap: 8, alignItems: 'flex-start' },
  suggestion: { padding: 12, minHeight: 44, justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#b6cbbd' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 16, backgroundColor: '#fff', color: '#19372e', fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  send: { backgroundColor: '#285b4b', borderRadius: 14, minHeight: 48, paddingHorizontal: 14, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  settings: { padding: 20, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  settingsCard: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16 },
  setting: { paddingVertical: 16, gap: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dce5dc' },
});
