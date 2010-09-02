#include <stdio.h>
#include <string.h>
#include <math.h>

#define SCRAMBLE_LENGTH_323 8

typedef unsigned long ulong;
typedef unsigned int uint;
typedef unsigned char uchar;

struct rand_struct {
  unsigned long seed1,seed2,max_value;
  double max_value_dbl;
};

void hash_password(ulong *result, const char *password, uint password_len)
{
  register ulong nr=1345345333L, add=7, nr2=0x12345671L;
  ulong tmp;
  const char *password_end= password + password_len;
  for (; password < password_end; password++)
  {
    if (*password == ' ' || *password == '\t')
      continue;                                 /* skip space in password */
    tmp= (ulong) (uchar) *password;
    nr^= (((nr & 63)+add)*tmp)+ (nr << 8);
    nr2+=(nr2 << 8) ^ nr;
    add+=tmp;
  }
  result[0]=nr & (((ulong) 1L << 31) -1L); /* Don't use sign bit (str2int) */;
  result[1]=nr2 & (((ulong) 1L << 31) -1L);
}

void randominit(struct rand_struct *rand_st, ulong seed1, ulong seed2)
{                                               /* For mysql 3.21.# */
#ifdef HAVE_purify
  bzero((char*) rand_st,sizeof(*rand_st));      /* Avoid UMC varnings */
#endif
  rand_st->max_value= 0x3FFFFFFFL;
  rand_st->max_value_dbl=(double) rand_st->max_value;
  rand_st->seed1=seed1%rand_st->max_value ;
  rand_st->seed2=seed2%rand_st->max_value;
}

double my_rnd(struct rand_struct *rand_st)
{
  rand_st->seed1=(rand_st->seed1*3+rand_st->seed2) % rand_st->max_value;
  rand_st->seed2=(rand_st->seed1+rand_st->seed2+33) % rand_st->max_value;
  return (((double) rand_st->seed1)/rand_st->max_value_dbl);
}

void scramble_323(char *to, const char *message, const char *password)
{
  struct rand_struct rand_st;
  ulong hash_pass[2], hash_message[2];

  if (password && password[0])
  {
    char extra, *to_start=to;
    const char *message_end= message + SCRAMBLE_LENGTH_323;
    hash_password(hash_pass,password, (uint) strlen(password));
    hash_password(hash_message, message, SCRAMBLE_LENGTH_323);
    randominit(&rand_st,hash_pass[0] ^ hash_message[0],
               hash_pass[1] ^ hash_message[1]);
    for (; message < message_end; message++)
      *to++= (char) (floor(my_rnd(&rand_st)*31)+64);
    extra=(char) (floor(my_rnd(&rand_st)*31));
    while (to_start != to)
      *(to_start++)^=extra;
  }
  *to= 0;
}

int main() {
  const char password1[] = "root";
  const char password2[] = "long password test";
  const char password3[] = "saf789yasfbsd89f";
  ulong result[2];
  char scrm[9]; // SCRAMBLE_LENGTH_323+1
  struct rand_struct rand_st;
  int i;

  // test hash_password
  hash_password((ulong*)result, password1, strlen(password1));
  printf("hash_password(\"%s\") = %08x%08x\n", password1, result[0], result[1]);

  hash_password((ulong*)result, password2, strlen(password2));
  printf("hash_password(\"%s\") = %08x%08x\n", password2, result[0], result[1]);

  hash_password((ulong*)result, password3, strlen(password3));
  printf("hash_password(\"%s\") = %08x%08x\n", password3, result[0], result[1]);


  // test randominit
  randominit(&rand_st, 0, 0);
  printf("randominit(0x00000000,0x00000000) = %08x, %08x\n", rand_st.seed1, rand_st.seed2);

  randominit(&rand_st, 0xFFFF, 0xFFFF);
  printf("randominit(0x0000FFFF,0x0000FFFF) = %08x, %08x\n", rand_st.seed1, rand_st.seed2);

  randominit(&rand_st, 0x50000000, 0x50000000);
  printf("randominit(0x50000000,0x50000000) = %08x, %08x\n", rand_st.seed1, rand_st.seed2);

  randominit(&rand_st, 0xFFFFFFFF, 0xFFFFFFFF);
  printf("randominit(0xFFFFFFFF,0xFFFFFFFF) = %08x, %08x\n", rand_st.seed1, rand_st.seed2);


  // test my_rnd
  randominit(&rand_st, 3252345, 7149734);
  printf("randominit(3252345, 7149734) = %08x, %08x\n", rand_st.seed1, rand_st.seed2);
  for (i=0; i<10; i++){
	  printf("my_rnd() : %.16f\n", my_rnd(&rand_st));
  }


  // test scramble_323
  scramble_323(scrm, "8bytesofstuff", "root");
  printf("scramble323(8bytesofstuff, root): %02x %02x %02x %02x %02x %02x %02x %02x %02x\n",
    scrm[0], scrm[1], scrm[2], scrm[3], scrm[4], scrm[5], scrm[6], scrm[7], scrm[8]);

  scramble_323(scrm, "e8cf00cec9ec825af22", "saf789yasfbsd");
  printf("scramble323(e8cf00cec9ec825af22, saf789yasfbsd): %02x %02x %02x %02x %02x %02x %02x %02x %02x\n",
    scrm[0], scrm[1], scrm[2], scrm[3], scrm[4], scrm[5], scrm[6], scrm[7], scrm[8]);

  return 23;
}

