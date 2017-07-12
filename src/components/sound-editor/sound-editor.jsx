import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import Box from '../box/box.jsx';
import Waveform from '../waveform/waveform.jsx';
import Label from '../forms/label.jsx';
import Input from '../forms/input.jsx';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import EffectButton from './effect-button.jsx';
import AudioTrimmer from '../../containers/audio-trimmer.jsx';

import styles from './sound-editor.css';

import playIcon from '../record-modal/icon--play.svg';
import stopIcon from '../record-modal/icon--stop-playback.svg';
import trimIcon from './icon--trim.svg';
import undoIcon from './icon--undo.svg';
import redoIcon from './icon--redo.svg';

const BufferedInput = BufferedInputHOC(Input);

const SoundEditor = props => (
    <Box className={styles.editorContainer}>
        <Box className={styles.row}>
            <Box className={styles.inputGroup}>
                {props.playhead ? (
                    <button
                        className={classNames(styles.button, styles.stopButtonn)}
                        onClick={props.onStop}
                    >
                        <img src={stopIcon} />
                    </button>
                ) : (
                    <button
                        className={classNames(styles.button, styles.playButton)}
                        onClick={props.onPlay}
                    >
                        <img src={playIcon} />
                    </button>
                )}
            </Box>
            <Box className={styles.inputGroup}>
                <Label text="Sound">
                    <BufferedInput
                        tabIndex="1"
                        type="text"
                        value={props.name}
                        onSubmit={props.onChangeName}
                    />
                </Label>
            </Box>
            <Box className={styles.inputGroupRight}>
                <button
                    className={classNames(styles.button, styles.trimButton, {
                        [styles.trimButtonActive]: props.trimStart !== null
                    })}
                    onClick={props.onActiveTrim}
                >
                    <img src={trimIcon} />
                    {props.trimStart === null ? 'Trim' : 'Save'}
                </button>
                <Box className={styles.inputGroup}>
                    <Box className={styles.buttonGroup}>
                        <button
                            className={styles.button}
                            disabled={!props.canUndo}
                            onClick={props.onUndo}
                        >
                            <img src={undoIcon} />
                        </button>
                        <button
                            className={styles.button}
                            disabled={!props.canRedo}
                            onClick={props.onRedo}

                        >
                            <img src={redoIcon} />
                        </button>
                    </Box>
                </Box>
            </Box>
        </Box>
        <Box className={styles.row}>
            <Box className={styles.waveformContainer}>
                <Waveform
                    data={props.chunkLevels}
                    height={180}
                    width={600}
                />
                <AudioTrimmer
                    playhead={props.playhead}
                    trimEnd={props.trimEnd}
                    trimStart={props.trimStart}
                    onSetTrimEnd={props.onSetTrimEnd}
                    onSetTrimStart={props.onSetTrimStart}
                />
            </Box>
        </Box>
        <Box className={styles.row}>
            {props.effects.map((effectProps, index) => (
                <EffectButton
                    key={index}
                    {...effectProps}
                />
            ))}
        </Box>
    </Box>
);

SoundEditor.propTypes = {
    canRedo: PropTypes.bool.isRequired,
    canUndo: PropTypes.bool.isRequired,
    chunkLevels: PropTypes.arrayOf(PropTypes.number).isRequired,
    effects: PropTypes.arrayOf(PropTypes.shape(EffectButton.propTypes)),
    name: PropTypes.string.isRequired,
    onActiveTrim: PropTypes.func,
    onChangeName: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onRedo: PropTypes.func,
    onSetTrimEnd: PropTypes.func,
    onSetTrimStart: PropTypes.func,
    onStop: PropTypes.func.isRequired,
    onUndo: PropTypes.func,
    playhead: PropTypes.number,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number
};

export default SoundEditor;
