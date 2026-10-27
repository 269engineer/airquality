# =============================================================
#  ESP32 - Surveillance Qualite Air (MicroPython)
#  WiFi + MQTT TLS (EMQX) + DHT22 + 3 capteurs MQ + LED/Buzzer
#  + Telegram Bot (alerte + statut)
# =============================================================
import network
import random
import time
import ssl
import json
import urequests
from machine import Pin, ADC
from dht import DHT22
from umqtt.simple import MQTTClient

# --- Identifiants WiFi ---
SSID     = "Wokwi-GUEST"
PASSWORD = ""

# --- Parametres MQTT EMQX ---
MQTT_SERVER = "..." #adresse du serveur MQTT
MQTT_PORT   = 0000 #numéro de port
MQTT_USER   = "..." #nom d'utilisateur
MQTT_PASS   = "*****" #mot de passe
MQTT_CLIENT = "...." #le nom du client MQTT
TOPIC       = b"....." #le dossier du client MQTT dans le serveur

# --- Identifiants Telegram ---
TOKEN   = "....."   # ton token BotFather
CHAT_ID = 00000000          # ton chat_id

# --- Capteurs MQ ---
mq2   = ADC(Pin(34))
mq7   = ADC(Pin(35))
mq135 = ADC(Pin(32))
for capteur in (mq2, mq7, mq135):
    capteur.atten(ADC.ATTN_11DB)
    capteur.width(ADC.WIDTH_12BIT)

# --- DHT22 ---
dht = DHT22(Pin(33))

# --- LED et buzzer ---
led    = Pin(26, Pin.OUT)
buzzer = Pin(27, Pin.OUT)

# --- Intervalle ---
INTERVALLE = 5000   # ms

client = None
#================================================
#  Telegram
# =============================================================
def send_telegram_message(msg):
    url = "https://api.telegram.org/bot{}/sendMessage".format(TOKEN)
    data = {"chat_id": CHAT_ID, "text": msg}
    try:
        r = urequests.post(url, json=data)
        print("Telegram:", r.text)
        r.close()
    except Exception as e:
        print("Erreur Telegram:", e)

def send_status():
    wlan = network.WLAN(network.STA_IF)
    if wlan.isconnected():
        ip = wlan.ifconfig()[0]
        send_telegram_message("✅ ESP32 en ligne\nIP: {}\nWiFi OK".format(ip))
    else:
        send_telegram_message("❌ ESP32 non connecté au WiFi")

# =============================================================
#  Connexion WiFi
# =============================================================
def connecter_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Connexion au WiFi :", SSID)
        wlan.connect(SSID, PASSWORD)
        while not wlan.isconnected():
            print(".", end="")
            time.sleep(0.5)
    print("\n[OK] WiFi connecte ! IP :", wlan.ifconfig()[0])

# =============================================================
#  Connexion MQTT
# =============================================================
def connecter_mqtt():
    global client
    contexte = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    contexte.verify_mode = ssl.CERT_NONE
    client = MQTTClient(
        MQTT_CLIENT, MQTT_SERVER, port=MQTT_PORT,
        user=MQTT_USER, password=MQTT_PASS,
        keepalive=60, ssl=contexte,
    )
    print("Connexion au broker MQTT EMQX ...", end="")
    client.connect()
    print(" [OK] Connecte a EMQX !")
    led.value(1); time.sleep(0.3); led.value(0)

# =============================================================
#  Lecture capteurs
# =============================================================
def lire_capteurs():
    v_mq2   = random.randint(0, 1100)
    v_mq7   = random.randint(0, 1500)
    v_mq135 = random.randint(0, 1100)
    try:
        dht.measure()
        temp = dht.temperature()
        hum  = dht.humidity()
        #Correction des valuers des capteurs MQ
        vf_mq2=v_mq2/(1+0.02*(temp-25)+0.01*(hum-50))
        vf_mq7=v_mq7/(1+0.02*(temp-25)+0.01*(hum-50))
        vf_mq135=v_mq135/(1+0.02*(temp-25)+0.01*(hum-50))
    except OSError:
        temp = 0.0
        hum  = 0.0
    return {"mq2": vf_mq2, "mq7": vf_mq7, "mq135": vf_mq135,
            "temp": round(temp, 1), "hum": round(hum, 1)}

# =============================================================
#  Programme principal
# =============================================================
def main():
    connecter_wifi()
    send_status()       # message Telegram au démarrage
    connecter_mqtt()

    dernier_envoi = time.ticks_ms()

    while True:
        if time.ticks_diff(time.ticks_ms(), dernier_envoi) >= INTERVALLE:
            dernier_envoi = time.ticks_ms()
            donnees = lire_capteurs()

            print("------------------------------------")
            print("MQ2   :", donnees["mq2"])
            print("MQ7   :", donnees["mq7"])
            print("MQ135 :", donnees["mq135"])
            print("Temp  :", donnees["temp"], "C")
            print("Hum   :", donnees["hum"], "%")

            payload = json.dumps(donnees)
            try:
                client.publish(TOPIC, payload)
                print("[ENVOYE ->", TOPIC.decode(), "]", payload)
            except OSError:
                print("[ERREUR] MQTT -> reconnexion")
                try:
                    connecter_mqtt()
                    client.publish(TOPIC, payload)
                except OSError as e:
                    print("[ECHEC] MQTT:", e)
            # Alerte
            # Définition des seuils pour chaque capteur
            seuils = {
                "mq2": 1100,
                "mq7": 1500,
                "mq135": 1100
            }
            alerte = any(donnees[capteur] > seuil for capteur, seuil in seuils.items())
            buzzer.value(0)
            led.value(0)

            if alerte:
                print(">>> ALERTE : seuil de gaz depasse ! <<<")
                for capteur, seuil in seuils.items():
                    if donnees[capteur] > seuil:
                        send_telegram_message(f">>> ALERTE : seuil de gaz depasse ! <<<\n{capteur.upper()} : {donnees[capteur]} ppm")
                led.value(1)
                buzzer.value(1)
                time.sleep(0.1)


# Entrée
main()
