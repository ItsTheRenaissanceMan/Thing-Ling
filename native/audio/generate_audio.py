#!/usr/bin/env python3
"""Author original seamless environmental loops and tactile game sounds.

No sampled recordings, external music, speech, or copyrighted sound assets are
used. Only seeded noise, oscillators, filters, envelopes and an original chord
sequence are used. Regeneration is deterministic. Python standard library only.
"""
from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import wave

ROOT = Path(__file__).resolve().parent
RATE = 22050
DURATION = 24
TAU = math.tau
BASE_PROFILES = {
 'town':'town', 'village':'town', 'courtyard':'garden', 'cafe':'cafe', 'tea-house':'cafe',
 'bakery':'bakery', 'restaurant':'restaurant', 'supermarket':'market', 'market':'market',
 'garden':'garden', 'orchard':'orchard', 'sanctuary':'sanctuary', 'conservatory':'conservatory',
 'cove':'coast', 'harbor':'coast', 'lighthouse':'lighthouse', 'post-office':'post', 'exchange':'post',
 'cottage':'home', 'home':'home', 'hotel':'hotel', 'nightclub':'club', 'club':'club',
 'station':'station', 'school':'school', 'clinic':'clinic', 'workshop':'workshop', 'library':'library',
 'museum':'museum', 'bank':'bank', 'tailor':'tailor', 'nightlife':'club', 'cinema':'cinema', 'music':'music', 'sports':'sports', 'post':'post', 'tea':'cafe',
}
MAP_KINDS = {
 'little-hello':'garden', 'kettle-on':'cafe', 'breakfast-club':'bakery', 'lantern-cafe':'cafe',
 'first-seedlings':'garden', 'orchard-colors':'orchard', 'small-neighbors':'sanctuary',
 'garden-in-bloom':'conservatory', 'water-edge':'coast', 'lost-and-found':'post',
 'homecoming-parcel':'home', 'harbor-lanterns':'lighthouse',
}


def seed(name):
    return int.from_bytes(hashlib.sha256(name.encode()).digest()[:8], 'little')


def write_wav(name, values, rate=RATE, loop=False):
    # A 20 ms cosine edge envelope reaches the same zero at both wrap points.
    # Long 24-second beds remain continuous; no endpoint step or click remains.
    if loop:
        fade = int(rate * .02)
        for i in range(fade):
            gain = .5 - .5*math.cos(math.pi*i/max(1,fade-1))
            values[i] *= gain
            values[-1-i] *= gain
    peak = max(abs(x) for x in values) or 1
    gain = min(1, .8 / peak)
    samples = array('h', (round(max(-1, min(1, x * gain)) * 32767) for x in values))
    with wave.open(str(ROOT / name), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(samples.tobytes())
    return math.sqrt(sum(x*x for x in values) / len(values))


def event(values, start, duration, frequency, amplitude, mode='tone', rng=None):
    begin = max(0, int(start*RATE))
    count = min(int(duration*RATE), len(values)-begin)
    low = 0
    for j in range(max(0, count)):
        t = j/RATE
        u = j/max(1, count-1)
        env = math.sin(math.pi*u)**1.5
        if mode == 'chirp':
            f = frequency + 1250*u + 150*math.sin(u*TAU*3)
            signal = math.sin(TAU*f*t) + .24*math.sin(TAU*f*2*t)
        elif mode == 'noise':
            low = .92*low + .08*rng.uniform(-1,1)
            signal = low * 4
        elif mode == 'paper':
            noise = rng.uniform(-1,1)
            low = .7*low + .3*noise
            signal = (noise-low) * math.sin(TAU*36*t)
        else:
            signal = math.sin(TAU*frequency*t) + .22*math.sin(TAU*frequency*2.01*t)
            env *= math.exp(-u*3)
        values[begin+j] += signal*env*amplitude


def compose_loop(name, kind):
    rng = random.Random(seed(name))
    count = RATE*DURATION
    values = array('f', [0])*count
    outside = kind in {'town','garden','orchard','sanctuary','coast','lighthouse'}
    low, middle = 0., 0.
    for i in range(count):
        t = i/RATE
        noise = rng.uniform(-1,1)
        low = .992*low + .008*noise
        middle = .84*middle + .16*noise
        wind = (low*5 + middle*.13) * (.032 if outside else .014)
        if kind in {'coast','lighthouse'}:
            surge = .22 + .78*(.5+.5*math.sin(TAU*t/8-.8))**2
            wind += middle*.17*surge
        elif kind in {'cafe','bakery','restaurant','market','post','station'}:
            # Air and remote, unintelligible room murmur; never fake language.
            wind += .012*math.sin(TAU*(123+4*math.sin(TAU*t/6))*t)*(.6+.4*math.sin(TAU*t/3))
            wind += middle*.018
        elif kind in {'library','museum','bank','hotel','clinic','home','tailor','school','workshop','conservatory','cinema','music','sports'}:
            wind += .0035*math.sin(TAU*55*t) + .0015*math.sin(TAU*110*t)
        values[i] = wind
    if outside or kind == 'conservatory':
        birds = 8 if kind in {'garden','orchard','sanctuary'} else 4
        for i in range(birds):
            event(values, .6+i*DURATION/birds+rng.random()*.5, .12+rng.random()*.13, 1700+rng.random()*900, .035, 'chirp', rng)
    if kind == 'town':
        for time in [4,13,20]: event(values,time,.09,950,.035,'tone',rng)
        for time in [7,16]: event(values,time,.7,160,.022,'noise',rng)
    if kind in {'cafe','restaurant','bakery'}:
        for time in [3.2,11.7,19.4]:
            event(values,time,.16,1700+rng.random()*500,.035,'tone',rng)
            event(values,time+.2,.14,2100,.02,'tone',rng)
        if kind == 'cafe':
            for time in [6,16]: event(values,time,1.5,0,.05,'noise',rng)
            event(values,9.5,1.1,0,.026,'paper',rng)
        if kind == 'bakery':
            for time in [5,16]: event(values,time,1.8,0,.03,'noise',rng)
            event(values,8,.2,620,.03,'tone',rng)
        if kind == 'restaurant':
            for time in [5,14,21]: event(values,time,.5,0,.027,'paper',rng)
    if kind == 'market':
        for time in [3,8,14,20]: event(values,time,.08,980,.035,'tone',rng)
        for time in [5,16]: event(values,time,.65,0,.02,'noise',rng)
    if kind in {'post','library','school','bank','tailor','museum'}:
        for time in [3,8,15,20]: event(values,time,.28+rng.random()*.2,0,.026 if kind!='library' else .014,'paper',rng)
        if kind == 'post': event(values,12,.1,650,.032,'tone',rng)
        if kind == 'school':
            for time in [6,6.3,6.6]: event(values,time,.14,850,.022,'tone',rng)
        if kind == 'tailor':
            for time in [5,13,20]: event(values,time,.45,0,.023,'paper',rng)
    if kind == 'workshop':
        for time in [3,3.4,3.8,12,12.4,19,19.4]: event(values,time,.1,180,.045,'tone',rng)
        event(values,7,1,0,.028,'paper',rng)
    if kind == 'station':
        event(values,4,5,0,.065,'noise',rng)
        for time in [12,12.4,12.8]: event(values,time,.2,650,.025,'tone',rng)
        event(values,18,.8,220,.025,'tone',rng)
    if kind == 'lighthouse':
        for time in [7,19]: event(values,time,1.7,165,.035,'tone',rng)
    if kind == 'sanctuary':
        for time in [5,17]: event(values,time,.3,550,.025,'chirp',rng)
    if kind in {'home','hotel'}:
        for time in range(2,DURATION,3): event(values,time,.045,440,.008,'tone',rng)
    if kind == 'cinema':
        for i in range(count):
            t=i/RATE
            values[i] += .006*math.sin(TAU*180*t)*(.7+.3*math.sin(TAU*24*t))
        for time in [5,17]:event(values,time,.6,0,.018,'paper',rng)
    if kind == 'music':
        for index,frequency in enumerate([261.63,329.63,392,493.88,220,261.63,329.63,392,293.66,349.23,440,523.25]):
            event(values,.8+index*1.8,1.2,frequency,.027,'tone',rng)
    if kind == 'sports':
        for time in [2,2.6,3.2,10,10.6,17,17.6,18.2]:event(values,time,.14,110,.047,'tone',rng)
        for time in [5,13,21]:event(values,time,.16,0,.025,'paper',rng)
    if kind == 'club':
        # Original 8-bar Cmaj7, Am7, Dm7, G7 sequence at 80 BPM.
        chords = [[130.81,164.81,196,246.94],[110,130.81,164.81,196],[146.83,174.61,220,261.63],[98,123.47,146.83,174.61]]
        for i in range(count):
            t = i/RATE
            chord = chords[min(3,int(t/6))]
            beat = t % .75
            kick = math.sin(TAU*(54*beat+32*(1-math.exp(-beat*28))/28))*math.exp(-beat*17)*.13
            hihat = rng.uniform(-1,1)*math.exp(-((t+.375)%.375)*85)*.018
            pad = sum(math.sin(TAU*f*t) for f in chord)*.009*(.75+.25*math.sin(TAU*t/6))
            bass = math.sin(TAU*chord[0]/2*t)*.035*(.6+.4*math.exp(-beat*7))
            values[i] += kick+hihat+pad+bass
    return values


def effect(name):
    rng = random.Random(seed(name))
    durations={'footstep':.13,'interact':.16,'collect':.4,'use':.22,'door':.8,'success':.8,'failure':.35,'transition':1.1,'coin':.3,'talk':.22,'click':.08}
    duration=durations[name]
    values=array('f',[0])*int(RATE*duration)
    if name=='footstep':
        for i in range(len(values)):
            t=i/RATE;values[i]=(rng.uniform(-1,1)*.12+math.sin(TAU*105*t)*.09)*math.exp(-t*32)
    elif name=='door':
        event(values,.02,.35,90,.09,'tone',rng);event(values,.4,.13,200,.12,'tone',rng);event(values,.55,.2,0,.04,'noise',rng)
    elif name=='transition':
        event(values,0,1.1,0,.08,'noise',rng)
    elif name=='failure':
        event(values,0,.25,220,.11,'tone',rng);event(values,.13,.2,196,.08,'tone',rng)
    elif name=='success':
        for i,f in enumerate([392,493.88,587.33,783.99]):event(values,i*.12,.32,f,.09,'tone',rng)
    else:
        f={'collect':660,'interact':440,'use':350,'coin':990,'talk':370,'click':720}[name]
        event(values,0,duration,f,.11,'tone',rng)
        if name=='collect':event(values,.15,.23,880,.08,'tone',rng)
    return values


def main():
    profiles={}
    aliases={}
    town=ROOT.parent/'data'/'town.json'
    if town.exists():
        for item in json.loads(town.read_text())['maps']:
            identifier=item['id'];requested=item.get('ambience',identifier)
            kind=MAP_KINDS.get(identifier,BASE_PROFILES.get(requested,BASE_PROFILES.get(identifier)))
            if kind is None:
                lowered=f"{identifier} {requested} {item.get('theme','')}".lower()
                kind=next((value for key,value in BASE_PROFILES.items() if key in lowered),'town' if identifier=='town' else 'home')
            profiles[requested]=kind
            aliases[identifier]=requested
    else:
        profiles={'town':'town',**MAP_KINDS}
    manifest={'version':1,'original':True,'sampleRate':RATE,'durationSeconds':DURATION,'profiles':{},'effects':{}}
    for name,kind in sorted(profiles.items()):
        filename=f'environment-{name}.wav'
        values=compose_loop(name,kind)
        current=math.sqrt(sum(value*value for value in values)/len(values)) or 1
        target={'club':.065,'coast':.045,'lighthouse':.038,'town':.032,'cafe':.026,'market':.026,'restaurant':.025,'bakery':.024,'garden':.024,'orchard':.024,'sanctuary':.024,'station':.03}.get(kind,.016)
        level=target/current
        for index in range(len(values)):values[index]*=level
        rms=write_wav(filename,values,loop=True)
        manifest['profiles'][name]={'path':f'res://audio/{filename}','kind':kind,'durationSeconds':DURATION,'rms':round(rms,5)}
        print(name,kind,flush=True)
    for identifier,requested in aliases.items():
        manifest['profiles'][identifier]=manifest['profiles'][requested]
    for alias,kind in BASE_PROFILES.items():
        if alias not in manifest['profiles']:
            candidate=next((entry for entry in manifest['profiles'].values() if entry['kind']==kind),None)
            if candidate is not None:manifest['profiles'][alias]=candidate
    for name in ['footstep','interact','collect','use','door','success','failure','transition','coin','talk','click']:
        filename=f'effect-{name}.wav';write_wav(filename,effect(name));manifest['effects'][name]=f'res://audio/{filename}'
    (ROOT/'profiles.json').write_text(json.dumps(manifest,indent=2)+'\n')


if __name__=='__main__':main()
