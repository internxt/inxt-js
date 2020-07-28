# inxt-js
API and CLI for the Internxt network

## CHANGELOG

<details>
  <summary>Project / General prerequisites (100%)</summary>
  
- - [X] Create the project
- - [X] Typescript
- - [X] Install and configure dependencies
- - [X] Browserify: Make lib browser-compatible

</details>

<details>
  <summary>Download (63%)</summary>
  
- - [X] Research C project (download logic)
- - [X] Make API request
- - - [X] Request file info
- - - [X] Request file mirrors
- - [X] Get shards info
- - [X] Connect to nodes and download shards
- - - [X] Check shard integrity after download
- - - [X] Try to download shard again if it fails
- - [ ] Exchange reports for each shard downloaded
- - [ ] FileMuxer
- - - [X] Get original code from js lib
- - - [X] Transcribe original code to TypeScript
- - - [X] Test
- - - [ ] Stop stream if shard integrity fails
- - - [ ] Retry shard download if it fails (3-5 times)
- - - [ ] If shard cannot be downloaded, request another mirror
- - - [ ] Blacklist the failed mirror
- - - [ ] Use some system to rewind stream and start again from the failed shard
- - [X] Download file as a stream
- - - [X] Create a dummy Readable stream
- - - [X] Pipe stream to FileMuxer
- - [X] Recompose file
- - [X] Decrypt file
- - [ ] Serve file
- - - [ ] As path on CLI version
- - - [ ] As blob in Browser version
- - [ ] Use erasure codes
- - - [ ] Detect if file can be recovered
- - - [ ] Detect if file NEEDS to be recovered (missing shards)
- - - [ ] Use parity shards to recompose the missing shards

  </details>

<details>
  <summary>Upload (0%)</summary>

- - [ ] Research C project
- - [ ] Make API request
- - [ ] Analize file info
- - [ ] Create shards
- - [ ] Publish shards on nodes
- - [ ] Exchange reports for each shard uploaded
- - [ ] Create parity shards with erasure codes

</details>
