import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import styles from './effect-button.css';

const EffectButton = props => (
    <div
        className={styles.effectContainer}
    >
        <Box
            className={styles.effectButton}
            onClick={props.onActivate}
        >
            <img
                className={styles.effectButtonIcon}
                src={props.icon}
            />
            <Box className={styles.effectButtonLabel}>{props.name}</Box>
        </Box>
    </div>
);

EffectButton.propTypes = {
    icon: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onActivate: PropTypes.func.isRequired
};

export default EffectButton;
