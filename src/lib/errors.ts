export enum ERRORS {
    FILE_ALREADY_EXISTS = 'File already exists',
    FILE_NOT_FOUND = 'File not found',
    BUCKET_NOT_FOUND = 'Bucket not found',
}

export enum CONTRACT_ERRORS {
    INVALID_SHARD_SIZES = 'Invalid shard sizes',
    NULL_NEGOTIATED_CONTRACT = 'Null negotiated contract'
}

export enum NODE_ERRORS {
    INVALID_TOKEN = 'The supplied token is not accepted',
    REJECTED_SHARD = 'Node rejected shard',
    NO_SPACE_LEFT = 'No space left',
    NOT_CONNECTED_TO_BRIDGE = 'Not connected to bridge',
    UNABLE_TO_LOCATE_CONTRACT = 'Unable to locate contract',
    DATA_SIZE_IS_NOT_AN_INTEGER = 'Data size is not an integer',
    UNABLE_TO_DETERMINE_FREE_SPACE = 'Unable to determine free space',
    SHARD_HASH_NOT_MATCHES = 'Calculated hash does not match the expected result',
    SHARD_SIZE_BIGGER_THAN_CONTRACTED = 'Shard exceeds the amount defined in the contract'
}
