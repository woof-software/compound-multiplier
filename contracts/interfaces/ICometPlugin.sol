pragma solidity =0.8.30;

interface ICometPlugin {
    struct Plugin {
        address endpoint;
        bytes config;
    }
}
