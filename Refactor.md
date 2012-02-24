# Refactorinig

* Support up to 53 Bit (8192 TB) values for LengthCodedInteger. Previously only
  up to 24 bit ones were implemented (which means no value bigger than
  16 MB could be sent). MySql theoretically supports up to 64 Bit, but JS
  Numbers do not - this limitation will remain for the time being.
