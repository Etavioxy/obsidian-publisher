use std::{fs, fs::File, io::Write};
use tempfile::tempdir;

use obsidian_publisher_server::utils::archive;

#[tokio::test]
async fn test_zip_extract_with_replace() {
    let td = tempdir().expect("tempdir");
    let src_dir = td.path().join("src");
    fs::create_dir_all(&src_dir).expect("create src dir");

    let a_path = src_dir.join("a.txt");
    let mut f = File::create(&a_path).expect("create a.txt");
    f.write_all(b"hello target world").expect("write a.txt");

    let b_path = src_dir.join("b.bin");
    let mut f2 = File::create(&b_path).expect("create b.bin");
    f2.write_all(&[0u8, 1, 2, 3]).expect("write b.bin");

    // create zip archive
    let zip_path = td.path().join("site.zip");
    let zip_file = File::create(&zip_path).expect("create zip");
    let mut zip = zip::ZipWriter::new(zip_file);
    // specify concrete type parameter for FileOptions to satisfy the zip crate's generic bound
    let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default();

    zip.start_file("a.txt", options).expect("start a.txt");
    zip.write_all(&fs::read(&a_path).expect("read a"))
        .expect("write a to zip");

    zip.start_file("b.bin", options).expect("start b.bin");
    zip.write_all(&fs::read(&b_path).expect("read b"))
        .expect("write b to zip");

    zip.finish().expect("finish zip");

    let outdir = td.path().join("out_zip");
    archive::extract_archive_with_replace(
        &zip_path,
        &outdir,
        Some(("target".to_string(), "repl".to_string())),
    )
    .await
    .expect("extract zip");

    let orig = fs::read_to_string(outdir.join("original").join("a.txt")).expect("read orig a");
    assert_eq!(orig, "hello target world");

    let repl = fs::read_to_string(outdir.join("replaced").join("a.txt")).expect("read repl a");
    assert_eq!(repl, "hello repl world");

    let orig_bin = fs::read(outdir.join("original").join("b.bin")).expect("read orig bin");
    let repl_bin = fs::read(outdir.join("replaced").join("b.bin")).expect("read repl bin");
    assert_eq!(orig_bin, repl_bin);
}

#[tokio::test]
async fn test_tar_gz_extract_with_replace() {
    let td = tempdir().expect("tempdir");
    let src_dir = td.path().join("src2");
    fs::create_dir_all(&src_dir).expect("create src dir");

    let a_path = src_dir.join("a.txt");
    let mut f = File::create(&a_path).expect("create a.txt");
    f.write_all(b"hello target world").expect("write a.txt");

    let b_path = src_dir.join("b.bin");
    let mut f2 = File::create(&b_path).expect("create b.bin");
    f2.write_all(&[0u8, 1, 2, 3]).expect("write b.bin");

    // create tar.gz archive
    let tar_gz_path = td.path().join("site.tar.gz");
    let tar_gz_file = File::create(&tar_gz_path).expect("create tar.gz");
    let enc = flate2::write::GzEncoder::new(tar_gz_file, flate2::Compression::default());
    let mut tar = tar::Builder::new(enc);

    tar.append_path_with_name(&a_path, "a.txt").expect("append a");
    tar.append_path_with_name(&b_path, "b.bin").expect("append b");

    // finish tar and encoder
    let enc = tar.into_inner().expect("into_inner");
    enc.finish().expect("finish encoder");

    let outdir = td.path().join("out_tar");
    archive::extract_archive_with_replace(
        &tar_gz_path,
        &outdir,
        Some(("target".to_string(), "repl".to_string())),
    )
    .await
    .expect("extract tar.gz");

    let orig = fs::read_to_string(outdir.join("original").join("a.txt")).expect("read orig a");
    assert_eq!(orig, "hello target world");

    let repl = fs::read_to_string(outdir.join("replaced").join("a.txt")).expect("read repl a");
    assert_eq!(repl, "hello repl world");

    let orig_bin = fs::read(outdir.join("original").join("b.bin")).expect("read orig bin");
    let repl_bin = fs::read(outdir.join("replaced").join("b.bin")).expect("read repl bin");
    assert_eq!(orig_bin, repl_bin);
}
