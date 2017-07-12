import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';

import {connect} from 'react-redux';

import {computeChunkedRMS} from '../lib/audio/audio-util.js';

import SoundEditorComponent from '../components/sound-editor/sound-editor.jsx';
import AudioBufferPlayer from '../lib/audio/audio-buffer-player.js';
import AudioEffects from '../lib/audio/audio-effects.js';

import higherIcon from '../components/sound-editor/icon--higher.svg';
import lowerIcon from '../components/sound-editor/icon--lower.svg';
import echoIcon from '../components/sound-editor/icon--echo.svg';
import reverseIcon from '../components/sound-editor/icon--reverse.svg';
import robotIcon from '../components/sound-editor/icon--robot.svg';
import louderIcon from '../components/sound-editor/icon--louder.svg';
import softerIcon from '../components/sound-editor/icon--softer.svg';

import SharedAudioContext from '../lib/audio/shared-audio-context.js';

const audioCtx = new SharedAudioContext();

class SoundEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleStoppedPlaying',
            'handleChangeName',
            'handlePlay',
            'handleStopPlaying',
            'handleUpdatePlayhead',
            'handleSubmitEffect',
            'handleActivateEffect',
            'handleActivateTrim',
            'handleUpdateTrimEnd',
            'handleUpdateTrimStart',
            'handleReverse',
            'resetEffects',
            'handleKeyPress',
            'handleUndo',
            'handleRedo'
        ]);
        this.state = {
            playhead: null, // null is not playing, [0 -> 1] is playing percent
            chunkLevels: computeChunkedRMS(this.props.samples),
            chipmunk: null,
            monster: null,
            echo: null,
            reverse: null,
            robot: null,
            louder: null,
            softer: null,
            trim: null,
            trimStart: null,
            trimEnd: null
        };
        this.undoStack = [];
        this.redoStack = [];
    }
    componentDidMount () {
        this.audioBufferPlayer = new AudioBufferPlayer(this.props.samples, this.props.sampleRate);
        document.addEventListener('keydown', this.handleKeyPress, false);
    }
    componentWillReceiveProps (newProps) {
        if (newProps.soundIndex !== this.props.soundIndex || newProps.samples !== this.props.samples) {
            this.undoStack = [];
            this.redoStack = [];
            this.audioBufferPlayer.stop();
            this.audioBufferPlayer = new AudioBufferPlayer(newProps.samples, newProps.sampleRate);
            this.setState({chunkLevels: computeChunkedRMS(newProps.samples), playhead: null});
        }
    }
    componentWillUnmount () {
        this.audioBufferPlayer.stop();
        document.removeEventListener('keydown', this.handleKeyPress, false);
    }
    pushUndo (samples) {
        this.undoStack.push(samples);
        this.redoStack = [];
    }
    getCurrentSamples () {
        const vm = this.props.vm;
        const sound = vm.editingTarget.sprite.sounds[this.props.soundIndex];
        const buffer = vm.runtime.audioEngine.audioBuffers[sound.md5];
        return {
            samples: buffer.getChannelData(0),
            sampleRate: buffer.sampleRate
        };
    }
    submitNewSamples (samples) {
        const vm = this.props.vm;
        const sound = vm.editingTarget.sprite.sounds[this.props.soundIndex];
        if (sound.md5.indexOf('-modified') === -1) {
            sound.md5 = `${sound.md5}-modified${Math.random()}`;
        }

        this.audioBufferPlayer.stop();
        this.audioBufferPlayer = new AudioBufferPlayer(samples, this.props.sampleRate);
        const newBuffer = audioCtx.createBuffer(1, samples.length, this.props.sampleRate);
        newBuffer.getChannelData(0).set(samples);
        vm.runtime.audioEngine.audioBuffers[sound.md5] = newBuffer;
        this.resetEffects();
        this.setState({chunkLevels: computeChunkedRMS(samples)});
        this.handlePlay();
    }
    handleUndo () {
        this.redoStack.push(this.getCurrentSamples().samples);
        const samples = this.undoStack.pop();
        if (samples) {
            this.submitNewSamples(samples);
        }
    }
    handleRedo () {
        const samples = this.redoStack.pop();
        if (samples) {
            this.undoStack.push(this.getCurrentSamples().samples);
            this.submitNewSamples(samples);
        }
    }
    resetEffects () {
        this.setState({
            chipmunk: null,
            monster: null,
            echo: null,
            reverse: null,
            robot: null,
            trim: null,
            louder: null,
            softer: null,
            trimStart: null,
            trimEnd: null
        });
    }
    handlePlay () {
        this.audioBufferPlayer.play(
            this.state.trimStart || 0,
            this.state.trimEnd || 1,
            this.handleUpdatePlayhead,
            this.handleStoppedPlaying);
    }
    handleStopPlaying () {
        this.audioBufferPlayer.stop();
        this.handleStoppedPlaying();
    }
    handleStoppedPlaying () {
        this.setState({playhead: null});
    }
    handleUpdatePlayhead (playhead) {
        this.setState({playhead});
    }
    handleChangeName (name) {
        this.props.onRenameSound(this.props.soundIndex, name);
    }
    handleSubmitEffect (effects) {
        this.handleStopPlaying();
        const {samples, sampleRate} = this.getCurrentSamples();
        const halfToneRatio = Math.pow(2, 1 / 12);
        const pitch = effects.monster ? 1 / halfToneRatio : (
            effects.chipmunk ? halfToneRatio : 1);
        const echo = effects.echo ? 0.5 * effects.echo : 0;
        const robot = effects.robot ? effects.robot : 0;
        const volume = effects.louder ? 1.25 : (effects.softer ? 0.75 : 1);
        this.pushUndo(samples);
        const audioEffects = new AudioEffects(samples, sampleRate, pitch, echo, robot, volume);
        audioEffects.apply().then(newBuffer => {
            const newSamples = newBuffer.getChannelData(0);
            this.submitNewSamples(newSamples);
        });
    }
    handleActivateEffect (effect) {
        const effects = {[effect]: this.state[effect] === null ? 0.5 : null};
        this.handleSubmitEffect(effects);
    }
    handleActivateTrim () {
        if (this.state.trimStart === null && this.state.trimEnd === null) {
            this.resetEffects();
            this.setState({trimEnd: 0.95, trimStart: 0.05, trim: true});
        } else {
            const {samples} = this.getCurrentSamples();
            const sampleCount = samples.length;
            const startIndex = Math.floor(this.state.trimStart * sampleCount);
            const endIndex = Math.floor(this.state.trimEnd * sampleCount);
            this.pushUndo(samples);

            const clippedSamples = samples.slice(startIndex, endIndex);
            this.submitNewSamples(clippedSamples);
        }
    }
    handleUpdateTrimEnd (trimEnd) {
        this.setState({trimEnd});
    }
    handleUpdateTrimStart (trimStart) {
        this.setState({trimStart});
    }
    handleReverse () {
        this.handleStopPlaying();
        const vm = this.props.vm;
        const sound = vm.editingTarget.sprite.sounds[this.props.soundIndex];
        const buffer = vm.runtime.audioEngine.audioBuffers[sound.md5];
        const samples = buffer.getChannelData(0);
        this.pushUndo(samples.slice(0));
        const clippedSamples = samples.reverse();

        this.submitNewSamples(clippedSamples);
    }
    handleKeyPress (e) {
        if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
            this.handleUndo();
        } else if (e.key === 'Z' && (e.metaKey || e.ctrlKey)) {
            this.handleRedo();
        }
    }
    render () {
        return (
            <SoundEditorComponent
                canRedo={this.redoStack.length > 0}
                canUndo={this.undoStack.length > 0}
                chunkLevels={this.state.chunkLevels}
                effects={[
                    {
                        name: 'Higher',
                        icon: higherIcon,
                        onActivate: () => this.handleActivateEffect('chipmunk')
                    },
                    {
                        name: 'Lower',
                        icon: lowerIcon,
                        onActivate: () => this.handleActivateEffect('monster')
                    },
                    {
                        name: 'Echo',
                        icon: echoIcon,
                        onActivate: () => this.handleActivateEffect('echo')
                    },
                    {
                        name: 'Robot',
                        icon: robotIcon,
                        onActivate: () => this.handleActivateEffect('robot')
                    },
                    {
                        name: 'Louder',
                        icon: louderIcon,
                        onActivate: () => this.handleActivateEffect('louder')
                    },
                    {
                        name: 'Softer',
                        icon: softerIcon,
                        onActivate: () => this.handleActivateEffect('softer')
                    },
                    {
                        name: 'Reverse',
                        icon: reverseIcon,
                        onActivate: this.handleReverse
                    }
                ]}
                name={this.props.name}
                playhead={this.state.playhead}
                trimEnd={this.state.trimEnd}
                trimStart={this.state.trimStart}
                onActiveTrim={this.handleActivateTrim}
                onChangeName={this.handleChangeName}
                onPlay={this.handlePlay}
                onRedo={this.handleRedo}
                onSetTrimEnd={this.handleUpdateTrimEnd}
                onSetTrimStart={this.handleUpdateTrimStart}
                onStop={this.handleStopPlaying}
                onUndo={this.handleUndo}
            />
        );
    }
}

SoundEditor.propTypes = {
    name: PropTypes.string.isRequired,
    onRenameSound: PropTypes.func.isRequired,
    sampleRate: PropTypes.number,
    samples: PropTypes.instanceOf(Float32Array),
    soundIndex: PropTypes.number,
    vm: PropTypes.instanceOf(VM)
};

const mapStateToProps = (state, {soundIndex}) => {
    const sound = state.vm.editingTarget.sprite.sounds[soundIndex];
    const audioBuffer = state.vm.runtime.audioEngine.audioBuffers[sound.md5];
    return {
        sampleRate: audioBuffer.sampleRate,
        samples: audioBuffer.getChannelData(0),
        name: sound.name,
        vm: state.vm,
        onRenameSound: state.vm.renameSound.bind(state.vm)
    };
};

export default connect(
    mapStateToProps
)(SoundEditor);
