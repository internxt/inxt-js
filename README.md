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
  <summary>Download (85%)</summary>
  
- - [X] Research C project (download logic)
- - [X] Make API request
- - - [X] Request file info
- - - [X] Request file mirrors
- - [X] Get shards info
- - [X] Connect to nodes and download shards
- - - [X] Check shard integrity after download
- - - [X] Try to download shard again if it fails
- - [ ] Exchange reports for each shard downloaded
- - [X] FileMuxer
- - - [X] Get original code from js lib
- - - [X] Transcribe original code to TypeScript
- - - [X] Test
- - - [ ] Stop stream if shard integrity fails
- - - [X] Retry shard download if it fails (3-5 times)
- - - [X] If shard cannot be downloaded, request another mirror
- - - [X] Blacklist the failed mirror
- - - [X] Use some system to rewind stream and start again from the failed shard
- - - [ ] Report file progress
- - [X] Download file as a stream
- - - [X] Create a dummy Readable stream
- - - [X] Pipe stream to FileMuxer
- - [X] Recompose file
- - [X] Decrypt file
- - [ ] Serve file
- - - [ ] As path on CLI version
- - - [ ] As blob in Browser version
- - [X] Use erasure codes
- - - [X] Detect if file can be recovered (has erasure codes)
- - - [X] Detect if file NEEDS to be recovered (missing shards)
- - - [X] Use parity shards to recompose the missing shards

  </details>

<details>
  <summary>Upload (100%)</summary>

- - [X] Research C project
- - [X] Make API request
- - [X] Analize file info
- - [X] Encrypt the file
- - [X] File Demuxer
- - - [X] Calculate the suitable size of shards
- - - [X] Split file into shards (all w/ same size)
- - - [X] Upload as a stream
- - - [X] Report upload progress
- - [x] Publish shards on nodes
- - [X] Check if shards are published
- - [X] Exchange reports for each shard uploaded (to trigger mirror creation)
- - [X] Create parity shards with erasure codes
- - [X] Publish all file info into the bucket

</details>
