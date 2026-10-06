@echo off
echo === Typecheck ===
call npm run typecheck
set TC=%errorlevel%
echo TC_EXIT=%TC%

echo === Lint ===
call npm run lint
set LINT=%errorlevel%
echo LINT_EXIT=%LINT%

echo === Tests ===
call npx vitest run --reporter=basic
set TEST=%errorlevel%
echo TEST_EXIT=%TEST%

echo === Build ===
call npm run build
set BUILD=%errorlevel%
echo BUILD_EXIT=%BUILD%

echo === Summary ===
echo TC=%TC% LINT=%LINT% TEST=%TEST% BUILD=%BUILD%