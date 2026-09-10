import mongoose from 'mongoose';

const RULObservationSchema = new mongoose.Schema(
    {
        device_id: {
            type: String,
            required: true,
            index: true,
        },

        timestamp: {
            type: Number,
            required: true,
            index: true,
        },

        // Raw sensor values used to calculate this observation.
        features: {
            vib_rms: {
                type: Number,
                required: false,
            },
            temp_belt: {
                type: Number,
                required: false,
            },
            temp_motor: {
                type: Number,
                required: false,
            },
            current_rms: {
                type: Number,
                required: false,
            },
        },

        // RUL pipeline outputs
        rulMinutes: {
            type: Number,
            default: null,
        },

        rulHours: {
            type: Number,
            default: null,
        },

        healthIndex: {
            type: Number,
            default: null,
        },

        asiT: {
            type: Number,
            default: null,
        },

        asi5min: {
            type: Number,
            default: null,
        },

        dSensor: {
            type: Number,
            default: null,
        },

        dT: {
            type: Number,
            default: null,
        },

        degradationRatePerMin: {
            type: Number,
            default: null,
        },

        regressionSlope: {
            type: Number,
            default: null,
        },

        regressionIntercept: {
            type: Number,
            default: null,
        },

        rSquared: {
            type: Number,
            default: null,
        },

        trendConfidence: {
            type: String,
            default: null,
        },

        weightingMethod: {
            type: String,
            default: null,
        },

        weights: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        status: {
            type: String,
            required: true,
        },

        reason: {
            type: String,
            default: null,
        },

        failureThreshold: {
            type: Number,
            default: 20,
        },

        method: {
            type: String,
            default: 'UNSUPERVISED_TREND_OLS_v1',
        },

        disclaimer: {
            type: String,
            default: 'ESTIMATION / FORMULA PENDING VALIDATION',
        },
    },
    {
        timestamps: true,
    }
);

// Efficient query for the rolling 15-minute RUL window.
RULObservationSchema.index({
    device_id: 1,
    timestamp: -1,
});

const RULObservation =
    mongoose.models.RULObservation ||
    mongoose.model('RULObservation', RULObservationSchema);

export default RULObservation;