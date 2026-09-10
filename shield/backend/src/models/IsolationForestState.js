import mongoose from 'mongoose';

const IsolationForestStateSchema = new mongoose.Schema(
    {
        modelKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        trees: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        trainedOn: {
            type: Number,
            default: 0,
        },

        subsampleSize: {
            type: Number,
            default: 0,
        },

        trainingHistory: {
            type: mongoose.Schema.Types.Mixed,
            default: [],
        },

        isTrained: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const IsolationForestState =
    mongoose.models.IsolationForestState ||
    mongoose.model(
        'IsolationForestState',
        IsolationForestStateSchema
    );

export default IsolationForestState;