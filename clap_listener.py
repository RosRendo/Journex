import pyaudio
import numpy as np
import time
import subprocess
import os
import sys

# Audio configuration
CHUNK = 1024           # Number of audio frames per buffer
FORMAT = pyaudio.paInt16 # 16-bit resolution
CHANNELS = 1           # 1 channel (Mono)
RATE = 44100           # 44.1kHz sampling rate
THRESHOLD = 3000       # Volume threshold for a clap (Adjust this if it's too sensitive/insensitive)
CLAP_INTERVAL = 1.0    # Maximum time in seconds between two claps to count as a "double clap"
COOLDOWN = 5.0         # Wait time after starting before listening again

# Redirect stdout/stderr so pythonw.exe doesn't crash on print()
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clap_log.txt")
log_file = open(log_path, "a")
sys.stdout = log_file
sys.stderr = log_file

def log(msg):
    log_file.write(str(msg) + "\n")
    log_file.flush()

def listen_for_claps():
    p = pyaudio.PyAudio()

    servers_launched = False
    
    log("[*] Initializing Microphone...")
    try:
        stream = p.open(format=FORMAT,
                        channels=CHANNELS,
                        rate=RATE,
                        input=True,
                        frames_per_buffer=CHUNK)
    except IOError as e:
        log(f"[!] Error opening microphone: {e}")
        log("Please ensure your microphone is connected and not blocked by privacy settings.")
        return

    log(f"[*] Listening for a Double Clap (Threshold: {THRESHOLD})...")
    
    claps = 0
    last_clap_time = 0

    try:
        while True:
            # Read audio data from microphone
            data = stream.read(CHUNK, exception_on_overflow=False)
            
            # Convert binary data to numpy array
            audio_data = np.frombuffer(data, dtype=np.int16)
            
            # Calculate Root Mean Square (RMS) to get volume amplitude
            volume = np.linalg.norm(audio_data) / np.sqrt(len(audio_data))
            
            if volume > 300: # Only show sounds that are at least somewhat loud to avoid spam
                if volume <= THRESHOLD:
                    log(f"[Mic Level: {volume:.0f}] (Too quiet to be a clap)")
            
            if volume > THRESHOLD:
                current_time = time.time()
                
                # Check if this is the first clap or if it's been too long since the last one
                if current_time - last_clap_time > CLAP_INTERVAL:
                    log(f"[Volume: {volume:.0f}] [*] One clap detected!")
                    claps = 1
                    last_clap_time = current_time
                    time.sleep(0.2) # Debounce to prevent one loud noise counting as multiple claps
                
                # Check if it's a second clap within the interval time
                elif 0.1 < (current_time - last_clap_time) <= CLAP_INTERVAL:
                    if not servers_launched:
                        log(f"[Volume: {volume:.0f}] [**] DOUBLE CLAP DETECTED! Starting servers...")
                        
                        # Run the start_local.bat script
                        bat_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "start_local.bat")
                        
                        # Launch the bat file independently
                        subprocess.Popen(f'start "" "{bat_path}"', shell=True)
                        servers_launched = True
                        
                        log(f"[*] Servers launched. Cooling down for {COOLDOWN} seconds...")
                    else:
                        log(f"[Volume: {volume:.0f}] [**] DOUBLE CLAP DETECTED, but servers are already running! Ignoring.")
                        
                    claps = 0
                    time.sleep(COOLDOWN)
                    log("[*] Listening for claps again...")
                
    except KeyboardInterrupt:
        log("\n[*] Stopped listening.")
    
    finally:
        stream.stop_stream()
        stream.close()
        p.terminate()

if __name__ == "__main__":
    log("        [*] CLAP-TO-START LISTENER ACTIVATED        ")
    listen_for_claps()
