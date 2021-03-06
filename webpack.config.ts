import * as path from 'path';
import * as webpack from 'webpack';
import * as _ from 'lodash';
import * as htmlWebpackPlugin from 'html-webpack-plugin';
const nodeExternals = require('webpack-node-externals');
const { StatsWriterPlugin } = require('webpack-stats-plugin');
import { stringReplaceLoaderOptions } from 'universal-async-component';

const dist = path.join(__dirname, 'dist');

const rules: webpack.Rule[] = [
    {
        test: /(\.ts|\.tsx)$/,
        get use() {
            const loaders: webpack.Loader[] = [
                {
                    loader: 'string-replace-loader',
                    options: stringReplaceLoaderOptions,
                },
                {
                    loader: 'awesome-typescript-loader',
                },
            ];
            if (process.env.NODE_ENV === 'development') {
                loaders.unshift({ loader: 'react-hot-loader/webpack' });
            }
            return loaders;
        },
        include: __dirname,
    },
    {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader'
    },
];

const resolve: webpack.Resolve = {
    modules: ['src', 'node_modules'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    mainFields: ['browser', 'module', 'main'],
};

const htmlMinifyConfig: htmlWebpackPlugin.MinifyConfig = {
    minifyCSS: true,
    minifyJS: false,
    removeComments: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
}

interface Configuration extends webpack.Configuration {
    name: string;
    target: any;
}

export const clientConfig: Configuration = {
    name: 'client',
    target: 'web',
    get entry() {
        const entry = ['./src/client']
        if (process.env.NODE_ENV === 'development') {
            return [
                'react-hot-loader/patch',
                'webpack-hot-middleware/client',
                ...entry,
            ];
        }
        return entry;
    },
    resolve,
    module: { rules },
    output: {
        path: dist,
        filename: '[name]-[hash].js',
        chunkFilename: '[name]-[chunkhash].chunk.js',
        publicPath: process.env.PUBLIC_PATH  || '/assets/',
    },
    devtool: 'source-map',
    get plugins() {
        const basePlugins = [
            new htmlWebpackPlugin({
                template: './src/index.html',
                inject: 'body',
                minify: process.env.NODE_ENV === 'production' ? htmlMinifyConfig : false,
                hash: false,
                showErrors: process.env.NODE_ENV === 'development',
            }),
            new StatsWriterPlugin({
                filename: 'client-stats.json',
                fields: ['chunks', 'publicPath', 'assets'],
            }),
            new webpack.optimize.CommonsChunkPlugin({
                name: 'vendor',
                minChunks(module) {
                    return typeof module.context === 'string' && module.context.indexOf('node_modules') > -1;
                },
            }),
            new webpack.optimize.CommonsChunkPlugin({
                names: ['bootstrap'],
                filename: 'webpack-bootstrap-[hash].js',
                minChunks: Infinity
            }),
            new webpack.NamedModulesPlugin(),
            // new webpack.ProvidePlugin({
            //     'process.env': JSON.stringify(_.pick(process.env, ['NODE_ENV'])),
            // }),
        ];
        if (process.env.NODE_ENV === 'development') {
            return [
                ...basePlugins,
                new webpack.HotModuleReplacementPlugin(),
                new webpack.NoEmitOnErrorsPlugin(),
            ];
        }
        return basePlugins;
    },
};

const serverConfig: Configuration = {
    name: 'server',
    target: 'node',
    entry: './src/server',
    resolve,
    module: { rules, },
    externals: [nodeExternals()],
    output: {
        path: dist,
        filename: 'server.js',
        libraryTarget: 'commonjs2'
    },
    devtool: 'source-map',
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1}),
        new webpack.NamedModulesPlugin(),
    ],
};

export default [
    clientConfig,
    serverConfig,
];
