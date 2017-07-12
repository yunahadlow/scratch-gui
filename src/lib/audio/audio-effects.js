import EchoEffect from './effects/echo-effect.js';
import DistortEffect from './effects/distort-effect.js';
import VolumeEffect from './effects/volume-effect.js';

class AudioEffects {
    constructor (samples, sampleRate, pitch, echo, distort, volume) {
        // @todo need to compensate for effect changes on sample time
        // echo of X seconds, decay at 0.5 => 0.5 ^ 3 = 0.03, (N+1) * X = additional time
        echo = echo ? 0.25 : 0;
        pitch = pitch || 1.0;
        distort = distort || 0;
        const echoExtra = echo * 3 * sampleRate;
        this.playbackStretch = pitch;
        this.echo = echo;
        this.distort = distort;
        this.volume = volume;
        this.audioContext = new OfflineAudioContext(1,
            (1 / this.playbackStretch) * (samples.length + echoExtra),
            sampleRate);

        this.buffer = this.audioContext.createBuffer(1, samples.length, this.audioContext.sampleRate);
        this.buffer.getChannelData(0).set(samples);
        this.source = null;
    }

    apply () {
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.playbackRate.value = this.playbackStretch;
        this.source.start();
        const effectNodes = [
            new EchoEffect(this.audioContext, this.echo),
            new DistortEffect(this.audioContext, this.distort),
            new VolumeEffect(this.audioContext, this.volume)
        ];

        for (let i = 1; i < effectNodes.length; i++) {
            const previousEffect = effectNodes[i - 1];
            const effect = effectNodes[i];
            previousEffect.output.connect(effect.input);
        }

        this.source.connect(effectNodes[0].input);

        effectNodes[effectNodes.length - 1].output.connect(this.audioContext.destination);


        return this.audioContext.startRendering();
    }

    dispose () {
        // @todo dispose properly?
    }
}

export default AudioEffects;
